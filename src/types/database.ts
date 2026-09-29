// GENERATED from the live Supabase project (unnnblkqzexvuachlbol) — do not edit.
// Regenerate with the Supabase MCP generate_typescript_types or `supabase gen types`.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          address_line: string
          city: string
          created_at: string
          district: string
          id: string
          is_default: boolean
          label: string | null
          phone: string
          postal_code: string
          province: string
          recipient_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line: string
          city: string
          created_at?: string
          district: string
          id?: string
          is_default?: boolean
          label?: string | null
          phone: string
          postal_code: string
          province: string
          recipient_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line?: string
          city?: string
          created_at?: string
          district?: string
          id?: string
          is_default?: boolean
          label?: string | null
          phone?: string
          postal_code?: string
          province?: string
          recipient_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          agent: string
          anonymous_id: string | null
          channel: string
          completed_at: string | null
          escalation_reason: string | null
          id: string
          intake: Json
          model: string | null
          provider: string | null
          safety_flagged: boolean
          started_at: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          agent?: string
          anonymous_id?: string | null
          channel?: string
          completed_at?: string | null
          escalation_reason?: string | null
          id?: string
          intake?: Json
          model?: string | null
          provider?: string | null
          safety_flagged?: boolean
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          agent?: string
          anonymous_id?: string | null
          channel?: string
          completed_at?: string | null
          escalation_reason?: string | null
          id?: string
          intake?: Json
          model?: string | null
          provider?: string | null
          safety_flagged?: boolean
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          agent: string | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          input_tokens: number | null
          latency_ms: number | null
          output_tokens: number | null
          retrieved_chunk_ids: string[]
          role: string
          safety: Json | null
        }
        Insert: {
          agent?: string | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          output_tokens?: number | null
          retrieved_chunk_ids?: string[]
          role: string
          safety?: Json | null
        }
        Update: {
          agent?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          output_tokens?: number | null
          retrieved_chunk_ids?: string[]
          role?: string
          safety?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_recommendations: {
        Row: {
          conversation_id: string | null
          created_at: string
          explanation: string | null
          id: string
          profile_snapshot: Json
          ranked_products: Json
          routine: Json
          scoring_version: string
          user_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          explanation?: string | null
          id?: string
          profile_snapshot: Json
          ranked_products: Json
          routine: Json
          scoring_version: string
          user_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          explanation?: string | null
          id?: string
          profile_snapshot?: Json
          ranked_products?: Json
          routine?: Json
          scoring_version?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_recommendations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          ai_conversation_id: string | null
          anonymous_id: string | null
          created_at: string
          event_name: string
          id: number
          order_id: string | null
          path: string | null
          product_id: string | null
          properties: Json
          referrer: string | null
          session_id: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          ai_conversation_id?: string | null
          anonymous_id?: string | null
          created_at?: string
          event_name: string
          id?: never
          order_id?: string | null
          path?: string | null
          product_id?: string | null
          properties?: Json
          referrer?: string | null
          session_id?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          ai_conversation_id?: string | null
          anonymous_id?: string | null
          created_at?: string
          event_name?: string
          id?: never
          order_id?: string | null
          path?: string | null
          product_id?: string | null
          properties?: Json
          referrer?: string | null
          session_id?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_ai_conversation_id_fkey"
            columns: ["ai_conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      article_categories: {
        Row: {
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      article_concerns: {
        Row: {
          article_id: string
          concern_id: string
        }
        Insert: {
          article_id: string
          concern_id: string
        }
        Update: {
          article_id?: string
          concern_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_concerns_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "journal_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_concerns_concern_id_fkey"
            columns: ["concern_id"]
            isOneToOne: false
            referencedRelation: "concerns"
            referencedColumns: ["id"]
          },
        ]
      }
      article_ingredients: {
        Row: {
          article_id: string
          ingredient_id: string
        }
        Insert: {
          article_id: string
          ingredient_id: string
        }
        Update: {
          article_id?: string
          ingredient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_ingredients_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "journal_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      article_products: {
        Row: {
          article_id: string
          product_id: string
        }
        Insert: {
          article_id: string
          product_id: string
        }
        Update: {
          article_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_products_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "journal_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      beauty_profiles: {
        Row: {
          budget_max: number | null
          concern_ids: string[]
          created_at: string
          current_routine: string[]
          id: string
          lifestyle: string[]
          notes: string | null
          preferences: string[]
          sensitivities: string[]
          skin_type_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          budget_max?: number | null
          concern_ids?: string[]
          created_at?: string
          current_routine?: string[]
          id?: string
          lifestyle?: string[]
          notes?: string | null
          preferences?: string[]
          sensitivities?: string[]
          skin_type_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          budget_max?: number | null
          concern_ids?: string[]
          created_at?: string
          current_routine?: string[]
          id?: string
          lifestyle?: string[]
          notes?: string | null
          preferences?: string[]
          sensitivities?: string[]
          skin_type_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beauty_profiles_skin_type_id_fkey"
            columns: ["skin_type_id"]
            isOneToOne: false
            referencedRelation: "skin_types"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          body: string | null
          coupon_id: string | null
          created_at: string
          cta_href: string | null
          cta_label: string | null
          ends_at: string | null
          headline: string | null
          id: string
          image_url: string | null
          name: string
          placement: string
          slug: string
          starts_at: string | null
          status: Database["public"]["Enums"]["publish_status"]
          target_concern_ids: string[]
          target_skin_type_ids: string[]
          updated_at: string
        }
        Insert: {
          body?: string | null
          coupon_id?: string | null
          created_at?: string
          cta_href?: string | null
          cta_label?: string | null
          ends_at?: string | null
          headline?: string | null
          id?: string
          image_url?: string | null
          name: string
          placement?: string
          slug: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["publish_status"]
          target_concern_ids?: string[]
          target_skin_type_ids?: string[]
          updated_at?: string
        }
        Update: {
          body?: string | null
          coupon_id?: string | null
          created_at?: string
          cta_href?: string | null
          cta_label?: string | null
          ends_at?: string | null
          headline?: string | null
          id?: string
          image_url?: string | null
          name?: string
          placement?: string
          slug?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["publish_status"]
          target_concern_ids?: string[]
          target_skin_type_ids?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          added_from: string | null
          cart_id: string
          created_at: string
          id: string
          product_id: string
          quantity: number
          variant_id: string | null
        }
        Insert: {
          added_from?: string | null
          cart_id: string
          created_at?: string
          id?: string
          product_id: string
          quantity: number
          variant_id?: string | null
        }
        Update: {
          added_from?: string | null
          cart_id?: string
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          coupon_code: string | null
          created_at: string
          id: string
          points_to_redeem: number
          recovery_sent_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          coupon_code?: string | null
          created_at?: string
          id?: string
          points_to_redeem?: number
          recovery_sent_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          coupon_code?: string | null
          created_at?: string
          id?: string
          points_to_redeem?: number
          recovery_sent_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_visible: boolean
          kind: string
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_visible?: boolean
          kind?: string
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_visible?: boolean
          kind?: string
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      concerns: {
        Row: {
          description: string | null
          id: string
          image_url: string | null
          is_visible: boolean
          name: string
          short_description: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          description?: string | null
          id?: string
          image_url?: string | null
          is_visible?: boolean
          name: string
          short_description?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          description?: string | null
          id?: string
          image_url?: string | null
          is_visible?: boolean
          name?: string
          short_description?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      content_blocks: {
        Row: {
          content: Json
          id: string
          locale: string
          page: string
          section: string
          sort_order: number
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content: Json
          id?: string
          locale?: string
          page: string
          section: string
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: Json
          id?: string
          locale?: string
          page?: string
          section?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          created_at: string
          discount_amount: number
          email: string
          id: string
          order_id: string
          user_id: string | null
        }
        Insert: {
          coupon_id: string
          created_at?: string
          discount_amount: number
          email: string
          id?: string
          order_id: string
          user_id?: string | null
        }
        Update: {
          coupon_id?: string
          created_at?: string
          discount_amount?: number
          email?: string
          id?: string
          order_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_discount: number | null
          min_subtotal: number
          starts_at: string | null
          times_used: number
          usage_limit: number | null
          usage_limit_per_user: number | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_subtotal?: number
          starts_at?: string | null
          times_used?: number
          usage_limit?: number | null
          usage_limit_per_user?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_subtotal?: number
          starts_at?: string | null
          times_used?: number
          usage_limit?: number | null
          usage_limit_per_user?: number | null
        }
        Relationships: []
      }
      customer_stories: {
        Row: {
          after_photo_url: string | null
          before_photo_url: string | null
          consent_obtained: boolean
          consent_reference: string | null
          created_at: string
          customer_location: string | null
          customer_name: string
          id: string
          photo_url: string | null
          product_ids: string[]
          quote: string
          relationship: string
          routine_summary: string | null
          sort_order: number
          source: string | null
          status: Database["public"]["Enums"]["content_status"]
          usage_duration: string | null
        }
        Insert: {
          after_photo_url?: string | null
          before_photo_url?: string | null
          consent_obtained?: boolean
          consent_reference?: string | null
          created_at?: string
          customer_location?: string | null
          customer_name: string
          id?: string
          photo_url?: string | null
          product_ids?: string[]
          quote: string
          relationship?: string
          routine_summary?: string | null
          sort_order?: number
          source?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          usage_duration?: string | null
        }
        Update: {
          after_photo_url?: string | null
          before_photo_url?: string | null
          consent_obtained?: boolean
          consent_reference?: string | null
          created_at?: string
          customer_location?: string | null
          customer_name?: string
          id?: string
          photo_url?: string | null
          product_ids?: string[]
          quote?: string
          relationship?: string
          routine_summary?: string | null
          sort_order?: number
          source?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          usage_duration?: string | null
        }
        Relationships: []
      }
      email_broadcast_recipients: {
        Row: {
          broadcast_id: string
          created_at: string
          email: string
          error: string | null
          id: string
          provider_message_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["broadcast_recipient_status"]
          subscriber_id: string | null
        }
        Insert: {
          broadcast_id: string
          created_at?: string
          email: string
          error?: string | null
          id?: string
          provider_message_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["broadcast_recipient_status"]
          subscriber_id?: string | null
        }
        Update: {
          broadcast_id?: string
          created_at?: string
          email?: string
          error?: string | null
          id?: string
          provider_message_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["broadcast_recipient_status"]
          subscriber_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_broadcast_recipients_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "email_broadcasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_broadcast_recipients_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "newsletter_subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_broadcasts: {
        Row: {
          audience: string
          body_markdown: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          cta_href: string | null
          cta_label: string | null
          failed_count: number
          id: string
          last_error: string | null
          preheader: string | null
          sent_count: number
          started_at: string | null
          status: Database["public"]["Enums"]["broadcast_status"]
          subject: string
          total_recipients: number
          updated_at: string
        }
        Insert: {
          audience?: string
          body_markdown: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          cta_href?: string | null
          cta_label?: string | null
          failed_count?: number
          id?: string
          last_error?: string | null
          preheader?: string | null
          sent_count?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["broadcast_status"]
          subject: string
          total_recipients?: number
          updated_at?: string
        }
        Update: {
          audience?: string
          body_markdown?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          cta_href?: string | null
          cta_label?: string | null
          failed_count?: number
          id?: string
          last_error?: string | null
          preheader?: string | null
          sent_count?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["broadcast_status"]
          subject?: string
          total_recipients?: number
          updated_at?: string
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string
          created_at: string
          id: string
          question: string
          search_document: unknown
          sort_order: number
          status: Database["public"]["Enums"]["content_status"]
          topic: string
          updated_at: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          question: string
          search_document?: unknown
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          topic?: string
          updated_at?: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          question?: string
          search_document?: unknown
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          benefit: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          inci_name: string | null
          name: string
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
          why_it_matters: string | null
        }
        Insert: {
          benefit?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          inci_name?: string | null
          name: string
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          why_it_matters?: string | null
        }
        Update: {
          benefit?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          inci_name?: string | null
          name?: string
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          why_it_matters?: string | null
        }
        Relationships: []
      }
      journal_articles: {
        Row: {
          author_id: string | null
          author_name: string | null
          body: string
          category_id: string | null
          cover_image_alt: string | null
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          published_at: string | null
          read_minutes: number | null
          search_document: unknown
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          body: string
          category_id?: string | null
          cover_image_alt?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          read_minutes?: number | null
          search_document?: unknown
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          body?: string
          category_id?: string | null
          cover_image_alt?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          read_minutes?: number | null
          search_document?: unknown
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "article_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          embedding: string | null
          embedding_model: string | null
          id: string
          search_document: unknown
          token_estimate: number | null
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          document_id: string
          embedding?: string | null
          embedding_model?: string | null
          id?: string
          search_document?: unknown
          token_estimate?: number | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          embedding_model?: string | null
          id?: string
          search_document?: unknown
          token_estimate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "knowledge_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_documents: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          body: string
          category: string
          created_at: string
          created_by: string | null
          id: string
          ingredient_id: string | null
          product_id: string | null
          source_id: string | null
          source_type: string
          status: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          body: string
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          ingredient_id?: string | null
          product_id?: string | null
          source_id?: string | null
          source_type?: string
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          body?: string
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          ingredient_id?: string | null
          product_id?: string | null
          source_id?: string | null
          source_type?: string
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_documents_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_documents_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_accounts: {
        Row: {
          balance: number
          lifetime_points: number
          tier_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          lifetime_points?: number
          tier_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          lifetime_points?: number
          tier_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_accounts_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "loyalty_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_rules: {
        Row: {
          description: string | null
          event: Database["public"]["Enums"]["loyalty_event"]
          id: string
          is_active: boolean
          per_amount: number | null
          points: number
          updated_at: string
        }
        Insert: {
          description?: string | null
          event: Database["public"]["Enums"]["loyalty_event"]
          id?: string
          is_active?: boolean
          per_amount?: number | null
          points: number
          updated_at?: string
        }
        Update: {
          description?: string | null
          event?: Database["public"]["Enums"]["loyalty_event"]
          id?: string
          is_active?: boolean
          per_amount?: number | null
          points?: number
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_tiers: {
        Row: {
          benefits: string[]
          id: string
          min_lifetime_points: number
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          benefits?: string[]
          id?: string
          min_lifetime_points?: number
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          benefits?: string[]
          id?: string
          min_lifetime_points?: number
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      loyalty_transactions: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          event: Database["public"]["Enums"]["loyalty_event"]
          id: string
          order_id: string | null
          points: number
          referral_id: string | null
          review_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event: Database["public"]["Enums"]["loyalty_event"]
          id?: string
          order_id?: string | null
          points: number
          referral_id?: string | null
          review_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event?: Database["public"]["Enums"]["loyalty_event"]
          id?: string
          order_id?: string | null
          points?: number
          referral_id?: string | null
          review_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          confirmed_at: string | null
          created_at: string
          email: string
          id: string
          source: string | null
          unsubscribe_token: string
          unsubscribed_at: string | null
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          email: string
          id?: string
          source?: string | null
          unsubscribe_token?: string
          unsubscribed_at?: string | null
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          email?: string
          id?: string
          source?: string | null
          unsubscribe_token?: string
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          image_url: string | null
          line_total: number
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          sku: string
          unit_price: number
          variant_id: string | null
          variant_name: string | null
        }
        Insert: {
          id?: string
          image_url?: string | null
          line_total: number
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          sku: string
          unit_price: number
          variant_id?: string | null
          variant_name?: string | null
        }
        Update: {
          id?: string
          image_url?: string | null
          line_total?: number
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          sku?: string
          unit_price?: number
          variant_id?: string | null
          variant_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          note: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          access_token: string
          ai_conversation_id: string | null
          cancelled_at: string | null
          coupon_code: string | null
          coupon_id: string | null
          created_at: string
          customer_name: string
          discount_total: number
          email: string
          id: string
          is_dropship: boolean
          notes: string | null
          order_number: string
          paid_at: string | null
          partner_tier_level: number | null
          partner_type: Database["public"]["Enums"]["partner_type"] | null
          phone: string
          points_discount: number
          points_earned: number
          points_redeemed: number
          shipping_address: string
          shipping_city: string
          shipping_courier: string | null
          shipping_district: string
          shipping_phone: string
          shipping_postal_code: string
          shipping_province: string
          shipping_recipient: string
          shipping_total: number
          source: Database["public"]["Enums"]["order_source"]
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          tracking_number: string | null
          updated_at: string
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          access_token?: string
          ai_conversation_id?: string | null
          cancelled_at?: string | null
          coupon_code?: string | null
          coupon_id?: string | null
          created_at?: string
          customer_name: string
          discount_total?: number
          email: string
          id?: string
          is_dropship?: boolean
          notes?: string | null
          order_number: string
          paid_at?: string | null
          partner_tier_level?: number | null
          partner_type?: Database["public"]["Enums"]["partner_type"] | null
          phone: string
          points_discount?: number
          points_earned?: number
          points_redeemed?: number
          shipping_address: string
          shipping_city: string
          shipping_courier?: string | null
          shipping_district: string
          shipping_phone: string
          shipping_postal_code: string
          shipping_province: string
          shipping_recipient: string
          shipping_total?: number
          source?: Database["public"]["Enums"]["order_source"]
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          access_token?: string
          ai_conversation_id?: string | null
          cancelled_at?: string | null
          coupon_code?: string | null
          coupon_id?: string | null
          created_at?: string
          customer_name?: string
          discount_total?: number
          email?: string
          id?: string
          is_dropship?: boolean
          notes?: string | null
          order_number?: string
          paid_at?: string | null
          partner_tier_level?: number | null
          partner_type?: Database["public"]["Enums"]["partner_type"] | null
          phone?: string
          points_discount?: number
          points_earned?: number
          points_redeemed?: number
          shipping_address?: string
          shipping_city?: string
          shipping_courier?: string | null
          shipping_district?: string
          shipping_phone?: string
          shipping_postal_code?: string
          shipping_province?: string
          shipping_recipient?: string
          shipping_total?: number
          source?: Database["public"]["Enums"]["order_source"]
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_ai_conversation_id_fkey"
            columns: ["ai_conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_accounts: {
        Row: {
          approved_at: string
          approved_by: string | null
          is_active: boolean
          member_type: Database["public"]["Enums"]["partner_type"]
          store_name: string | null
          tier_level: number
          user_id: string
        }
        Insert: {
          approved_at?: string
          approved_by?: string | null
          is_active?: boolean
          member_type: Database["public"]["Enums"]["partner_type"]
          store_name?: string | null
          tier_level?: number
          user_id: string
        }
        Update: {
          approved_at?: string
          approved_by?: string | null
          is_active?: boolean
          member_type?: Database["public"]["Enums"]["partner_type"]
          store_name?: string | null
          tier_level?: number
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          checkout_url: string | null
          created_at: string
          expires_at: string | null
          failure_reason: string | null
          id: string
          method: string | null
          order_id: string
          paid_at: string | null
          provider: string
          provider_reference: string | null
          raw_response: Json | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          checkout_url?: string | null
          created_at?: string
          expires_at?: string | null
          failure_reason?: string | null
          id?: string
          method?: string | null
          order_id: string
          paid_at?: string | null
          provider: string
          provider_reference?: string | null
          raw_response?: Json | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          checkout_url?: string | null
          created_at?: string
          expires_at?: string | null
          failure_reason?: string | null
          id?: string
          method?: string | null
          order_id?: string
          paid_at?: string | null
          provider?: string
          provider_reference?: string | null
          raw_response?: Json | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_benefits: {
        Row: {
          body: string | null
          evidence_reference: string | null
          id: string
          product_id: string
          review_status: Database["public"]["Enums"]["content_status"]
          reviewed_at: string | null
          reviewed_by: string | null
          sort_order: number
          title: string
        }
        Insert: {
          body?: string | null
          evidence_reference?: string | null
          id?: string
          product_id: string
          review_status?: Database["public"]["Enums"]["content_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          sort_order?: number
          title: string
        }
        Update: {
          body?: string | null
          evidence_reference?: string | null
          id?: string
          product_id?: string
          review_status?: Database["public"]["Enums"]["content_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_benefits_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          category_id: string
          product_id: string
        }
        Insert: {
          category_id: string
          product_id: string
        }
        Update: {
          category_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_concerns: {
        Row: {
          concern_id: string
          product_id: string
          relevance: number
        }
        Insert: {
          concern_id: string
          product_id: string
          relevance?: number
        }
        Update: {
          concern_id?: string
          product_id?: string
          relevance?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_concerns_concern_id_fkey"
            columns: ["concern_id"]
            isOneToOne: false
            referencedRelation: "concerns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_concerns_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_faqs: {
        Row: {
          answer: string
          evidence_reference: string | null
          id: string
          product_id: string
          question: string
          review_status: Database["public"]["Enums"]["content_status"]
          reviewed_at: string | null
          reviewed_by: string | null
          sort_order: number
        }
        Insert: {
          answer: string
          evidence_reference?: string | null
          id?: string
          product_id: string
          question: string
          review_status?: Database["public"]["Enums"]["content_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          sort_order?: number
        }
        Update: {
          answer?: string
          evidence_reference?: string | null
          id?: string
          product_id?: string
          question?: string
          review_status?: Database["public"]["Enums"]["content_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_faqs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt: string
          created_at: string
          id: string
          product_id: string
          sort_order: number
          url: string
        }
        Insert: {
          alt: string
          created_at?: string
          id?: string
          product_id: string
          sort_order?: number
          url: string
        }
        Update: {
          alt?: string
          created_at?: string
          id?: string
          product_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_ingredients: {
        Row: {
          concentration: string | null
          ingredient_id: string
          is_key: boolean
          product_id: string
          sort_order: number
        }
        Insert: {
          concentration?: string | null
          ingredient_id: string
          is_key?: boolean
          product_id: string
          sort_order?: number
        }
        Update: {
          concentration?: string | null
          ingredient_id?: string
          is_key?: boolean
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_ingredients_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_relations: {
        Row: {
          product_id: string
          related_product_id: string
          relation: string
          sort_order: number
        }
        Insert: {
          product_id: string
          related_product_id: string
          relation: string
          sort_order?: number
        }
        Update: {
          product_id?: string
          related_product_id?: string
          relation?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_relations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_relations_related_product_id_fkey"
            columns: ["related_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_skin_types: {
        Row: {
          product_id: string
          skin_type_id: string
        }
        Insert: {
          product_id: string
          skin_type_id: string
        }
        Update: {
          product_id?: string
          skin_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_skin_types_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_skin_types_skin_type_id_fkey"
            columns: ["skin_type_id"]
            isOneToOne: false
            referencedRelation: "skin_types"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          compare_price: number | null
          id: string
          is_default: boolean
          name: string
          price: number
          product_id: string
          sku: string
          sort_order: number
          stock: number
        }
        Insert: {
          compare_price?: number | null
          id?: string
          is_default?: boolean
          name: string
          price: number
          product_id: string
          sku: string
          sort_order?: number
          stock?: number
        }
        Update: {
          compare_price?: number | null
          id?: string
          is_default?: boolean
          name?: string
          price?: number
          product_id?: string
          sku?: string
          sort_order?: number
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          bpom_number: string | null
          bpom_status: string
          compare_price: number | null
          copy_evidence_reference: string | null
          copy_reviewed_at: string | null
          copy_reviewed_by: string | null
          copy_status: Database["public"]["Enums"]["content_status"]
          created_at: string
          description: string | null
          full_ingredients: string | null
          how_to_use: string | null
          id: string
          is_featured: boolean
          is_hypoallergenic: boolean | null
          low_stock_threshold: number
          name: string
          popularity_score: number
          positioning: string | null
          price: number
          primary_category_id: string | null
          product_type: string | null
          rating_avg: number
          review_count: number
          routine_step_id: string | null
          routine_time: Database["public"]["Enums"]["routine_time"] | null
          search_document: unknown
          short_description: string | null
          size: string | null
          sku: string
          slug: string
          status: Database["public"]["Enums"]["publish_status"]
          stock: number
          texture: string | null
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          bpom_number?: string | null
          bpom_status?: string
          compare_price?: number | null
          copy_evidence_reference?: string | null
          copy_reviewed_at?: string | null
          copy_reviewed_by?: string | null
          copy_status?: Database["public"]["Enums"]["content_status"]
          created_at?: string
          description?: string | null
          full_ingredients?: string | null
          how_to_use?: string | null
          id?: string
          is_featured?: boolean
          is_hypoallergenic?: boolean | null
          low_stock_threshold?: number
          name: string
          popularity_score?: number
          positioning?: string | null
          price: number
          primary_category_id?: string | null
          product_type?: string | null
          rating_avg?: number
          review_count?: number
          routine_step_id?: string | null
          routine_time?: Database["public"]["Enums"]["routine_time"] | null
          search_document?: unknown
          short_description?: string | null
          size?: string | null
          sku: string
          slug: string
          status?: Database["public"]["Enums"]["publish_status"]
          stock?: number
          texture?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          bpom_number?: string | null
          bpom_status?: string
          compare_price?: number | null
          copy_evidence_reference?: string | null
          copy_reviewed_at?: string | null
          copy_reviewed_by?: string | null
          copy_status?: Database["public"]["Enums"]["content_status"]
          created_at?: string
          description?: string | null
          full_ingredients?: string | null
          how_to_use?: string | null
          id?: string
          is_featured?: boolean
          is_hypoallergenic?: boolean | null
          low_stock_threshold?: number
          name?: string
          popularity_score?: number
          positioning?: string | null
          price?: number
          primary_category_id?: string | null
          product_type?: string | null
          rating_avg?: number
          review_count?: number
          routine_step_id?: string | null
          routine_time?: Database["public"]["Enums"]["routine_time"] | null
          search_document?: unknown
          short_description?: string | null
          size?: string | null
          sku?: string
          slug?: string
          status?: Database["public"]["Enums"]["publish_status"]
          stock?: number
          texture?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_primary_category_id_fkey"
            columns: ["primary_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_routine_step_id_fkey"
            columns: ["routine_step_id"]
            isOneToOne: false
            referencedRelation: "routine_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          marketing_opt_in: boolean
          phone: string | null
          referral_code: string | null
          updated_at: string
          whatsapp: string | null
          whatsapp_opt_in: boolean
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          marketing_opt_in?: boolean
          phone?: string | null
          referral_code?: string | null
          updated_at?: string
          whatsapp?: string | null
          whatsapp_opt_in?: boolean
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          marketing_opt_in?: boolean
          phone?: string | null
          referral_code?: string | null
          updated_at?: string
          whatsapp?: string | null
          whatsapp_opt_in?: boolean
        }
        Relationships: []
      }
      recommendation_weights: {
        Row: {
          budget_match: number
          concern_match: number
          id: string
          popularity: number
          preference_match: number
          routine_match: number
          skin_type_match: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          budget_match?: number
          concern_match?: number
          id?: string
          popularity?: number
          preference_match?: number
          routine_match?: number
          skin_type_match?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          budget_match?: number
          concern_match?: number
          id?: string
          popularity?: number
          preference_match?: number
          routine_match?: number
          skin_type_match?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          qualifying_order_id: string | null
          referred_email: string | null
          referred_user_id: string | null
          referrer_id: string
          rewarded_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          qualifying_order_id?: string | null
          referred_email?: string | null
          referred_user_id?: string | null
          referrer_id: string
          rewarded_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          qualifying_order_id?: string | null
          referred_email?: string | null
          referred_user_id?: string | null
          referrer_id?: string
          rewarded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_qualifying_order_id_fkey"
            columns: ["qualifying_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_applications: {
        Row: {
          city: string | null
          created_at: string
          desired_level: number
          full_name: string
          id: string
          member_type: Database["public"]["Enums"]["partner_type"]
          message: string | null
          phone: string
          reviewed_at: string | null
          reviewed_by: string | null
          sales_channel: string | null
          status: Database["public"]["Enums"]["moderation_status"]
          store_name: string | null
          user_id: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          desired_level?: number
          full_name: string
          id?: string
          member_type: Database["public"]["Enums"]["partner_type"]
          message?: string | null
          phone: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sales_channel?: string | null
          status?: Database["public"]["Enums"]["moderation_status"]
          store_name?: string | null
          user_id: string
        }
        Update: {
          city?: string | null
          created_at?: string
          desired_level?: number
          full_name?: string
          id?: string
          member_type?: Database["public"]["Enums"]["partner_type"]
          message?: string | null
          phone?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sales_channel?: string | null
          status?: Database["public"]["Enums"]["moderation_status"]
          store_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      review_media: {
        Row: {
          alt: string | null
          id: string
          review_id: string
          sort_order: number
          url: string
        }
        Insert: {
          alt?: string | null
          id?: string
          review_id: string
          sort_order?: number
          url: string
        }
        Update: {
          alt?: string | null
          id?: string
          review_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_media_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          author_name: string
          body: string
          created_at: string
          id: string
          is_verified_purchase: boolean
          moderated_at: string | null
          moderated_by: string | null
          order_id: string | null
          product_id: string
          rating: number
          skin_type: string | null
          status: Database["public"]["Enums"]["moderation_status"]
          title: string | null
          usage_duration: string | null
          user_id: string | null
        }
        Insert: {
          author_name: string
          body: string
          created_at?: string
          id?: string
          is_verified_purchase?: boolean
          moderated_at?: string | null
          moderated_by?: string | null
          order_id?: string | null
          product_id: string
          rating: number
          skin_type?: string | null
          status?: Database["public"]["Enums"]["moderation_status"]
          title?: string | null
          usage_duration?: string | null
          user_id?: string | null
        }
        Update: {
          author_name?: string
          body?: string
          created_at?: string
          id?: string
          is_verified_purchase?: boolean
          moderated_at?: string | null
          moderated_by?: string | null
          order_id?: string | null
          product_id?: string
          rating?: number
          skin_type?: string | null
          status?: Database["public"]["Enums"]["moderation_status"]
          title?: string | null
          usage_duration?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_redemptions: {
        Row: {
          coupon_id: string | null
          created_at: string
          id: string
          points_spent: number
          reward_id: string
          status: string
          user_id: string
        }
        Insert: {
          coupon_id?: string | null
          created_at?: string
          id?: string
          points_spent: number
          reward_id: string
          status?: string
          user_id: string
        }
        Update: {
          coupon_id?: string | null
          created_at?: string
          id?: string
          points_spent?: number
          reward_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          points_cost: number
          product_id: string | null
          reward_type: string
          reward_value: number
          stock: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          points_cost: number
          product_id?: string | null
          reward_type: string
          reward_value?: number
          stock?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          points_cost?: number
          product_id?: string | null
          reward_type?: string
          reward_value?: number
          stock?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rewards_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_products: {
        Row: {
          note: string | null
          product_id: string
          routine_id: string
          routine_step_id: string
        }
        Insert: {
          note?: string | null
          product_id: string
          routine_id: string
          routine_step_id: string
        }
        Update: {
          note?: string | null
          product_id?: string
          routine_id?: string
          routine_step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_products_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_products_routine_step_id_fkey"
            columns: ["routine_step_id"]
            isOneToOne: false
            referencedRelation: "routine_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_steps: {
        Row: {
          description: string | null
          id: string
          name: string
          slug: string
          step_order: number
          time_of_day: Database["public"]["Enums"]["routine_time"]
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
          slug: string
          step_order: number
          time_of_day?: Database["public"]["Enums"]["routine_time"]
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
          slug?: string
          step_order?: number
          time_of_day?: Database["public"]["Enums"]["routine_time"]
        }
        Relationships: []
      }
      routines: {
        Row: {
          concern_id: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          skin_type_id: string | null
          slug: string
          status: Database["public"]["Enums"]["publish_status"]
          time_of_day: Database["public"]["Enums"]["routine_time"]
        }
        Insert: {
          concern_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          skin_type_id?: string | null
          slug: string
          status?: Database["public"]["Enums"]["publish_status"]
          time_of_day: Database["public"]["Enums"]["routine_time"]
        }
        Update: {
          concern_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          skin_type_id?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["publish_status"]
          time_of_day?: Database["public"]["Enums"]["routine_time"]
        }
        Relationships: [
          {
            foreignKeyName: "routines_concern_id_fkey"
            columns: ["concern_id"]
            isOneToOne: false
            referencedRelation: "concerns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_skin_type_id_fkey"
            columns: ["skin_type_id"]
            isOneToOne: false
            referencedRelation: "skin_types"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          description: string | null
          is_public: boolean
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          is_public?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          is_public?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      skin_types: {
        Row: {
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      social_posts: {
        Row: {
          author_handle: string | null
          caption: string | null
          created_at: string
          id: string
          image_url: string
          is_ugc: boolean
          permalink: string
          platform: string
          product_ids: string[]
          rights_confirmed: boolean
          sort_order: number
          status: Database["public"]["Enums"]["publish_status"]
        }
        Insert: {
          author_handle?: string | null
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          is_ugc?: boolean
          permalink: string
          platform?: string
          product_ids?: string[]
          rights_confirmed?: boolean
          sort_order?: number
          status?: Database["public"]["Enums"]["publish_status"]
        }
        Update: {
          author_handle?: string | null
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          is_ugc?: boolean
          permalink?: string
          platform?: string
          product_ids?: string[]
          rights_confirmed?: boolean
          sort_order?: number
          status?: Database["public"]["Enums"]["publish_status"]
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_routine_items: {
        Row: {
          id: string
          note: string | null
          product_id: string | null
          routine_step_id: string | null
          step_order: number
          time_of_day: Database["public"]["Enums"]["routine_time"]
          user_routine_id: string
        }
        Insert: {
          id?: string
          note?: string | null
          product_id?: string | null
          routine_step_id?: string | null
          step_order: number
          time_of_day: Database["public"]["Enums"]["routine_time"]
          user_routine_id: string
        }
        Update: {
          id?: string
          note?: string | null
          product_id?: string | null
          routine_step_id?: string | null
          step_order?: number
          time_of_day?: Database["public"]["Enums"]["routine_time"]
          user_routine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_routine_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_routine_items_routine_step_id_fkey"
            columns: ["routine_step_id"]
            isOneToOne: false
            referencedRelation: "routine_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_routine_items_user_routine_id_fkey"
            columns: ["user_routine_id"]
            isOneToOne: false
            referencedRelation: "user_routines"
            referencedColumns: ["id"]
          },
        ]
      }
      user_routines: {
        Row: {
          ai_recommendation_id: string | null
          created_at: string
          id: string
          name: string
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_recommendation_id?: string | null
          created_at?: string
          id?: string
          name?: string
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_recommendation_id?: string | null
          created_at?: string
          id?: string
          name?: string
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_routines_ai_recommendation_id_fkey"
            columns: ["ai_recommendation_id"]
            isOneToOne: false
            referencedRelation: "ai_recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          created_at: string
          error: string | null
          event_type: string | null
          external_id: string
          id: string
          payload: Json
          processed_at: string | null
          source: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_type?: string | null
          external_id: string
          id?: string
          payload: Json
          processed_at?: string | null
          source: string
        }
        Update: {
          created_at?: string
          error?: string | null
          event_type?: string | null
          external_id?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          source?: string
        }
        Relationships: []
      }
      whatsapp_conversations: {
        Row: {
          ai_enabled: boolean
          assigned_to: string | null
          created_at: string
          display_name: string | null
          id: string
          last_inbound_at: string | null
          last_outbound_at: string | null
          lead_stage: string
          status: string
          updated_at: string
          user_id: string | null
          wa_id: string
        }
        Insert: {
          ai_enabled?: boolean
          assigned_to?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          lead_stage?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          wa_id: string
        }
        Update: {
          ai_enabled?: boolean
          assigned_to?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          lead_stage?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          wa_id?: string
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          body: string | null
          conversation_id: string
          created_at: string
          direction: string
          id: string
          message_type: string
          payload: Json | null
          sent_by: string | null
          staff_id: string | null
          status: string | null
          wa_message_id: string | null
        }
        Insert: {
          body?: string | null
          conversation_id: string
          created_at?: string
          direction: string
          id?: string
          message_type?: string
          payload?: Json | null
          sent_by?: string | null
          staff_id?: string | null
          status?: string | null
          wa_message_id?: string | null
        }
        Update: {
          body?: string | null
          conversation_id?: string
          created_at?: string
          direction?: string
          id?: string
          message_type?: string
          payload?: Json | null
          sent_by?: string | null
          staff_id?: string | null
          status?: string | null
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      wholesale_prices: {
        Row: {
          id: string
          level: number
          member_type: Database["public"]["Enums"]["partner_type"]
          min_qty: number
          name: string
          product_id: string
          unit_price: number
        }
        Insert: {
          id?: string
          level: number
          member_type: Database["public"]["Enums"]["partner_type"]
          min_qty?: number
          name: string
          product_id: string
          unit_price: number
        }
        Update: {
          id?: string
          level?: number
          member_type?: Database["public"]["Enums"]["partner_type"]
          min_qty?: number
          name?: string
          product_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "wholesale_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlists: {
        Row: {
          created_at: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_adjust_points: {
        Args: {
          p_points: number
          p_reason: string
          p_staff_id: string
          p_user_id: string
        }
        Returns: Json
      }
      award_birthday_points: { Args: { p_today?: string }; Returns: Json }
      kpi_dashboard: { Args: { p_from: string; p_to: string }; Returns: Json }
      mark_order_paid: {
        Args: {
          p_amount: number
          p_method?: string
          p_order_id: string
          p_provider: string
          p_provider_reference: string
          p_raw?: Json
        }
        Returns: Json
      }
      match_knowledge: {
        Args: {
          p_categories?: string[]
          p_embedding?: string
          p_limit?: number
          p_product_ids?: string[]
          p_query: string
        }
        Returns: {
          category: string
          chunk_id: string
          content: string
          document_id: string
          ingredient_id: string
          product_id: string
          score: number
          title: string
        }[]
      }
      place_order: {
        Args: {
          p_ai_conversation_id?: string
          p_coupon_code?: string
          p_customer: Json
          p_items: Json
          p_notes?: string
          p_points?: number
          p_shipping: Json
          p_source?: Database["public"]["Enums"]["order_source"]
          p_user_id?: string
        }
        Returns: Json
      }
      quote_cart: {
        Args: {
          p_coupon_code?: string
          p_email?: string
          p_items: Json
          p_points?: number
          p_user_id?: string
        }
        Returns: Json
      }
      redeem_reward: {
        Args: { p_reward_id: string; p_user_id: string }
        Returns: Json
      }
      release_order: {
        Args: {
          p_note?: string
          p_order_id: string
          p_status: Database["public"]["Enums"]["order_status"]
        }
        Returns: Json
      }
      search_catalog: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          id: string
          image_url: string
          kind: string
          rank: number
          slug: string
          subtitle: string
          title: string
        }[]
      }
      whatsapp_contact_context: {
        Args: { p_user_id?: string; p_wa_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "customer" | "admin" | "owner"
      broadcast_recipient_status: "pending" | "sent" | "failed"
      broadcast_status: "draft" | "sending" | "sent" | "failed"
      content_status: "draft" | "pending_review" | "approved" | "archived"
      loyalty_event:
        | "purchase"
        | "review"
        | "referral"
        | "birthday"
        | "signup"
        | "redemption"
        | "adjustment"
        | "expiry"
        | "reversal"
      moderation_status: "pending" | "approved" | "rejected"
      order_source: "web" | "whatsapp" | "ai_assistant" | "admin"
      order_status:
        | "pending_payment"
        | "paid"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "payment_failed"
        | "expired"
        | "refunded"
      partner_type: "reseller" | "dropshipper"
      payment_status: "pending" | "paid" | "failed" | "expired" | "refunded"
      publish_status: "draft" | "active" | "archived"
      routine_time: "am" | "pm" | "both"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["customer", "admin", "owner"],
      broadcast_recipient_status: ["pending", "sent", "failed"],
      broadcast_status: ["draft", "sending", "sent", "failed"],
      content_status: ["draft", "pending_review", "approved", "archived"],
      loyalty_event: [
        "purchase",
        "review",
        "referral",
        "birthday",
        "signup",
        "redemption",
        "adjustment",
        "expiry",
        "reversal",
      ],
      moderation_status: ["pending", "approved", "rejected"],
      order_source: ["web", "whatsapp", "ai_assistant", "admin"],
      order_status: [
        "pending_payment",
        "paid",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "payment_failed",
        "expired",
        "refunded",
      ],
      partner_type: ["reseller", "dropshipper"],
      payment_status: ["pending", "paid", "failed", "expired", "refunded"],
      publish_status: ["draft", "active", "archived"],
      routine_time: ["am", "pm", "both"],
    },
  },
} as const
