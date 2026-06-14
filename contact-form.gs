/**
 * Pre-Approved — contact & free-chapter form handler (sends via your Gmail).
 *
 * SETUP (about 5 minutes, free):
 *  1. Go to https://script.google.com  ->  New project.
 *  2. Delete the sample code, paste ALL of this in.
 *  3. Set TO_EMAIL below to where you want submissions delivered.
 *  4. Click Deploy -> New deployment.
 *       - Select type: Web app
 *       - Description: Pre-Approved form
 *       - Execute as: Me
 *       - Who has access: Anyone
 *     Click Deploy, authorize when prompted (it's your own script).
 *  5. Copy the Web app URL (it ends in /exec).
 *  6. In index.html, replace BOTH occurrences of
 *       PASTE_YOUR_FORM_ENDPOINT_URL
 *     with that /exec URL. Save. Done — the forms now email you.
 *
 * The email's reply-to is set to the visitor, so you can just hit Reply.
 */

var TO_EMAIL = "contact@carscu.com";   // <-- where form submissions are sent

function doPost(e) {
  try {
    var p = (e && e.parameter) ? e.parameter : {};

    // Honeypot: real visitors leave this empty; bots fill it. Silently drop spam.
    if (p.company_website) { return reply_("ok"); }

    var formName = p.form_name || "Website form";
    var lines = [];
    if (p.name)         lines.push("Name: " + p.name);
    if (p.email)        lines.push("Email: " + p.email);
    if (p.organization) lines.push("Credit union / org: " + p.organization);
    if (p.inquiry_type) lines.push("Inquiry: " + p.inquiry_type);
    if (p.message)      lines.push("\nMessage:\n" + p.message);
    var body = lines.join("\n") || "(no fields submitted)";

    MailApp.sendEmail({
      to: TO_EMAIL,
      subject: "[Pre-Approved] " + formName + (p.email ? " — " + p.email : ""),
      replyTo: p.email || TO_EMAIL,
      name: "Pre-Approved Website",
      body: body
    });

    return reply_("ok");
  } catch (err) {
    return reply_("error: " + err);
  }
}

function doGet() {
  return reply_("Pre-Approved form endpoint is live.");
}

function reply_(text) {
  return ContentService.createTextOutput(text)
    .setMimeType(ContentService.MimeType.TEXT);
}
