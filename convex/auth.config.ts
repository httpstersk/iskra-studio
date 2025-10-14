/**
 * Clerk Authentication Configuration for Convex
 *
 * This configuration enables Convex to validate JWT tokens issued by Clerk,
 * allowing authenticated access to queries and mutations.
 *
 * @remarks
 * When a user signs in via Clerk, a JWT token is generated and included in
 * requests to Convex. This config tells Convex how to verify those tokens.
 *
 * The JWT issuer domain is derived from your Clerk application settings.
 * It typically follows the format: https://<clerk-app-id>.clerk.accounts.dev
 *
 * @see https://clerk.com/docs/integrations/databases/convex
 * @see https://docs.convex.dev/auth/clerk
 */

const authConfig = {
  /**
   * Authentication providers configuration
   *
   * Clerk is configured as the primary authentication provider.
   * Multiple providers can be added if needed (e.g., custom JWT, other OAuth providers).
   */
  providers: [
    {
      /**
       * Application ID from Clerk Dashboard
       *
       * This identifies your Clerk application. It's extracted from the
       * publishable key (e.g., from pk_test_abc123... extract the domain).
       *
       * @remarks
       * Convex will automatically derive this from the Clerk JWT token's issuer.
       */
      applicationID: "convex",

      /**
       * Domain for JWT token verification
       *
       * This is the issuer domain from Clerk's JWT tokens.
       * Format: https://<your-clerk-frontend-api>.clerk.accounts.dev
       *
       * You can find this in your Clerk Dashboard under:
       * - API Keys → Advanced → JWT Issuer Domain
       *
       * Or decode a JWT token and check the "iss" (issuer) claim.
       *
       * @example
       * For a Clerk app with frontend API "clerk.abc123.xyz.lcl.dev",
       * the domain would be: "https://clerk.abc123.xyz.lcl.dev"
       */
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
    },
  ],
};

export default authConfig;
