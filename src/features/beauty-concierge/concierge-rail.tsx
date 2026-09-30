import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/states";
import { ROUTES } from "@/constants/routes";
import { getSessionUserId } from "@/lib/auth/session";
import { getLoyaltySummary, type LoyaltySummary } from "@/services/account/account";
import { getOwnBeautyProfile, getQuizOptions } from "@/services/quiz/quiz";
import { getOwnRoutine } from "@/services/routine/routine";

import { buildRailModel, type RailModel } from "./rail-model";
import { RailPromptChips } from "./rail-prompt-chips";

const SIGN_IN_HREF = `${ROUTES.signIn}?next=${encodeURIComponent(ROUTES.beautyConcierge)}`;

async function loadRailModel(): Promise<RailModel> {
  const userId = await getSessionUserId();
  if (!userId) return buildRailModel({ signedIn: false, profile: null, routine: null, loyalty: null });

  // Every read runs as the customer; RLS is the authorization.
  const [options, routine, loyalty] = await Promise.all([getQuizOptions(), getOwnRoutine(), getLoyaltySummary()]);
  const profile = await getOwnBeautyProfile(options);
  return buildRailModel({
    signedIn: true,
    profile,
    routine: routine ? { am: routine.view.am.length, pm: routine.view.pm.length } : routine,
    loyalty,
  });
}

/** Personal context beside the concierge. Displays only; sends nothing to the AI. */
export async function ConciergeRail() {
  const model = await loadRailModel();
  return (
    <>
      <details className="rounded-lg border border-border bg-surface desktop:hidden">
        <summary className="flex min-h-11 cursor-pointer items-center px-4 text-body-s font-medium">{model.summary}</summary>
        <div className="border-t border-border p-4">
          <RailBody model={model} />
        </div>
      </details>
      <div className="hidden rounded-lg border border-border bg-surface p-5 desktop:block">
        <RailBody model={model} />
      </div>
    </>
  );
}

function RailBody({ model }: { model: RailModel }) {
  if (model.kind !== "personal") {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="font-display text-h4">Kenali kulitmu</h2>
        <p className="text-body-s text-text-secondary">Ikuti Skin Quiz agar Beauty AI bisa memberi saran sesuai profil kulitmu.</p>
        <ButtonLink href={ROUTES.skinQuiz} variant="secondary">
          Mulai Skin Quiz
        </ButtonLink>
        {model.kind === "signed-out" && (
          <p className="text-body-s text-text-secondary">
            <Link href={SIGN_IN_HREF} className="font-medium text-text-primary underline underline-offset-4">
              Masuk
            </Link>{" "}
            agar Beauty AI dapat memakai profil kulit dan rutinitasmu.
          </p>
        )}
        {model.kind === "no-profile" && model.loyalty && <PointsRow loyalty={model.loyalty} />}
        <RailPromptChips prompts={model.prompts} />
      </div>
    );
  }

  const { profile, routine, loyalty } = model;
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-h4">Profil kecantikanmu</h2>
      <dl className="flex flex-col gap-3 text-body-s">
        {profile.skinType && (
          <div>
            <dt className="text-text-secondary">Jenis kulit</dt>
            <dd className="font-medium">{profile.skinType}</dd>
          </div>
        )}
        {profile.concerns.length > 0 && (
          <div>
            <dt className="text-text-secondary">Kebutuhan kulit</dt>
            <dd className="font-medium">{profile.concerns.join(", ")}</dd>
          </div>
        )}
        {routine && (
          <div>
            <dt className="text-text-secondary">Rutinitas</dt>
            <dd className="font-medium">
              {routine.am} langkah pagi · {routine.pm} langkah malam
            </dd>
          </div>
        )}
      </dl>
      {loyalty && <PointsRow loyalty={loyalty} />}
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-body-s">
        <Link href={ROUTES.account.routine} className="font-medium underline underline-offset-4">
          {routine && routine.am + routine.pm > 0 ? "Lihat rutinitas" : "Buat routine"}
        </Link>
        <Link href={ROUTES.account.skinProfile} className="font-medium underline underline-offset-4">
          Perbarui profil kulit
        </Link>
      </div>
      <RailPromptChips prompts={model.prompts} />
    </div>
  );
}

function PointsRow({ loyalty }: { loyalty: LoyaltySummary }) {
  return (
    <p className="text-body-s">
      <span className="text-text-secondary">CNS Rewards: </span>
      <span className="font-medium">
        {loyalty.balance.toLocaleString("id-ID")} poin{loyalty.tierName ? ` · ${loyalty.tierName}` : ""}
      </span>
    </p>
  );
}

/** Same footprint as the rail, so nothing jumps when it streams in. */
export function ConciergeRailSkeleton() {
  return (
    <>
      <Skeleton className="h-11 w-full desktop:hidden" />
      <div className="hidden flex-col gap-3 rounded-lg border border-border bg-surface p-5 desktop:flex">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-11 w-full" />
      </div>
    </>
  );
}
