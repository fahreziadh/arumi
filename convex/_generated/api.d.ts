/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as ai from "../ai.js";
import type * as aiConfig from "../aiConfig.js";
import type * as auth from "../auth.js";
import type * as coachAi from "../coachAi.js";
import type * as coachCategories from "../coachCategories.js";
import type * as coachScore from "../coachScore.js";
import type * as conversations from "../conversations.js";
import type * as http from "../http.js";
import type * as openrouter from "../openrouter.js";
import type * as personas from "../personas.js";
import type * as platformStyle from "../platformStyle.js";
import type * as prepare from "../prepare.js";
import type * as profile from "../profile.js";
import type * as prompts from "../prompts.js";
import type * as stats from "../stats.js";
import type * as streak from "../streak.js";
import type * as templates from "../templates.js";
import type * as usage from "../usage.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  ai: typeof ai;
  aiConfig: typeof aiConfig;
  auth: typeof auth;
  coachAi: typeof coachAi;
  coachCategories: typeof coachCategories;
  coachScore: typeof coachScore;
  conversations: typeof conversations;
  http: typeof http;
  openrouter: typeof openrouter;
  personas: typeof personas;
  platformStyle: typeof platformStyle;
  prepare: typeof prepare;
  profile: typeof profile;
  prompts: typeof prompts;
  stats: typeof stats;
  streak: typeof streak;
  templates: typeof templates;
  usage: typeof usage;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
