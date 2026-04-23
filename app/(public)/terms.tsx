import { LegalDocumentScreen } from "../../src/features/legal/LegalDocumentScreen";

export default function TermsScreen() {
  return (
    <LegalDocumentScreen
      title="Terms of Use"
      updatedAt="23 April 2026"
      intro="These Terms explain the basic rules for using Redress during MVP testing. By creating an account, you agree to use the app responsibly and follow these rules."
      sections={[
        {
          title: "Who can use Redress",
          body: [
            "You must be at least 13 years old to create an account. If local law requires a parent or guardian to approve your use, you are responsible for getting that approval.",
            "You are responsible for keeping your account secure and for activity that happens through your account.",
          ],
        },
        {
          title: "Your content",
          body: [
            "You may upload outfit videos, captions, clothing tags, links, comments, grades, reports, and profile information. You must have the rights and permissions needed to share anything you upload.",
            "Do not upload illegal content, harassment, hate, explicit sexual content, threats, private information about others, malicious links, or content that infringes someone else's rights.",
          ],
        },
        {
          title: "Moderation and safety",
          body: [
            "Redress may remove content, limit access, or disable accounts when needed to protect users, respond to reports, operate the service, or comply with law.",
            "Reports, grades, comments, and outbound link activity may be used to operate the product, investigate abuse, and improve safety.",
          ],
        },
        {
          title: "Shopping and external links",
          body: [
            "Tagged clothing links may open third-party websites. Redress does not sell those products, control those websites, or take responsibility for their prices, availability, checkout, delivery, returns, or privacy practices.",
            "Creators must only add safe http/https links. Unsafe schemes and malformed links are blocked by the app where possible.",
          ],
        },
        {
          title: "MVP availability",
          body: [
            "Redress is an MVP and may change, break, or be unavailable while it is being tested. Features may be added, removed, reset, or changed without notice during development.",
            "These Terms do not limit mandatory consumer rights or privacy rights that apply under Swedish or EU law.",
          ],
        },
        {
          title: "Contact",
          body: [
            "For MVP testing questions, contact the Redress project owner through the same channel that invited you to test the app. A dedicated support and legal contact should be added before public launch.",
          ],
        },
      ]}
    />
  );
}
