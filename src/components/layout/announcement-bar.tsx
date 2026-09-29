import Link from "next/link";

import { ANNOUNCEMENTS, type Announcement } from "@/config/site";

/** First announcement whose window contains `now`. Exported for tests. */
export function getActiveAnnouncement(
  announcements: readonly Announcement[],
  now: Date,
): Announcement | undefined {
  return announcements.find(({ startsAt, endsAt }) => {
    if (startsAt && new Date(startsAt) > now) return false;
    if (endsAt && new Date(endsAt) <= now) return false;
    return true;
  });
}

export function AnnouncementBar() {
  const announcement = getActiveAnnouncement(ANNOUNCEMENTS, new Date());
  if (!announcement) return null;

  return (
    <div className="bg-primary px-4 py-2 text-center text-caption tracking-wide text-on-primary">
      {announcement.href ? (
        <Link href={announcement.href} className="underline-offset-4 hover:underline">
          {announcement.message}
        </Link>
      ) : (
        <p>{announcement.message}</p>
      )}
    </div>
  );
}
