import { LegalDocumentScreen } from "../../src/features/legal/LegalDocumentScreen";

export default function PrivacyScreen() {
  return (
    <LegalDocumentScreen
      title="Privacy Notice"
      updatedAt="23 April 2026"
      intro="This Privacy Notice explains how Redress handles personal data during MVP testing. It is written for users in Sweden and the EU/EEA, where GDPR privacy rights apply."
      externalLinks={[
        {
          label: "File a GDPR complaint with IMY",
          url: "https://www.imy.se/en/individuals/forms-and-e-services/file-a-gdpr-complaint/",
        },
        {
          label: "Learn about your rights as a data subject",
          url: "https://www.imy.se/en/individuals/data-protection/your-rights-as-a-data-subject/",
        },
      ]}
      sections={[
        {
          title: "Controller and scope",
          body: [
            "For MVP testing, Redress is the controller for the personal data processed in the app. The app is operated from Sweden for development and testing.",
            "For privacy questions or requests during testing, contact the Redress project owner through the same invitation or testing channel that gave you access. A dedicated privacy email/contact should be added before public launch.",
          ],
        },
        {
          title: "Data we process",
          body: [
            "Account data: email address, Supabase user id, username, avatar URL, bio, sign-in/session data, and timestamps.",
            "Content and activity data: videos, captions, clothing tags, optional product links, comments, grades, follows, reports, outbound link click logs, app-open events, post impressions, and Reveal Items opens.",
            "Technical data: app configuration needed to authenticate, store content, load the feed, prevent abuse, and debug development issues.",
          ],
        },
        {
          title: "Why we process it",
          body: [
            "We process account and content data to provide the app experience you request, including authentication, publishing, feed display, profiles, comments, grading, reporting, and link opening.",
            "We process reports, logs, and safety signals to protect users, detect abuse, troubleshoot problems, and maintain the service.",
            "For MVP analytics, we use product and event data such as app opens, post impressions, Reveal Items opens, published posts, grades, reports, and outbound clicks to understand whether the product is working. Redress does not use ad tracking in the MVP.",
          ],
        },
        {
          title: "Legal bases",
          body: [
            "For core app functionality, the legal basis is performance of the user agreement. For safety, abuse prevention, debugging, and product measurement, the legal basis is legitimate interests. Where law requires consent, Redress should collect it separately before relying on it.",
            "Before public launch, the final privacy notice should confirm the exact controller identity, processor list, retention periods, international transfer safeguards, and contact details.",
          ],
        },
        {
          title: "Sharing and processors",
          body: [
            "Redress uses Supabase for authentication, database, and storage. Videos may be stored in the configured Supabase Storage bucket and can be visible where the current app design makes them public.",
            "If you open a tagged clothing link, the destination website receives the request in your browser and handles that visit under its own terms and privacy policy.",
          ],
        },
        {
          title: "Retention and deletion",
          body: [
            "MVP data is kept while your account or test data is needed to run and evaluate the app. You can request deletion through the testing contact channel.",
            "Some safety records, such as reports or abuse investigation data, may need to be retained longer where needed to protect users, resolve disputes, or comply with law.",
          ],
        },
        {
          title: "Your GDPR rights",
          body: [
            "You can request access, correction, deletion, restriction, portability, and objection where those rights apply under GDPR.",
            "If you believe your personal data is handled incorrectly, you can complain to the Swedish Authority for Privacy Protection, Integritetsskyddsmyndigheten (IMY).",
          ],
        },
        {
          title: "Children",
          body: [
            "Redress requires users to confirm they are at least 13 years old before account creation. The app should not knowingly collect account data from children below that age.",
          ],
        },
      ]}
    />
  );
}
