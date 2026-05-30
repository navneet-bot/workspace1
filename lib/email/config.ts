export function validateEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || process.env.JJ_FROM_EMAIL;

  let isValid = true;

  if (!apiKey) {
    console.error("❌ [Email Config Error] RESEND_API_KEY is missing or empty.");
    isValid = false;
  } else if (!apiKey.startsWith("re_")) {
    console.warn("⚠️ [Email Config Warning] RESEND_API_KEY does not start with 're_'. It may be invalid.");
  }

  if (!fromEmail) {
    console.error("❌ [Email Config Error] EMAIL_FROM is missing or empty.");
    isValid = false;
  } else if (!fromEmail.includes("@")) {
    console.error(`❌ [Email Config Error] EMAIL_FROM ('${fromEmail}') is not a valid email address.`);
    isValid = false;
  }

  if (isValid) {
    console.log(`✅ [Email Config] Resend configured successfully. Default sender: ${fromEmail}`);
  }

  return {
    isConfigured: isValid,
    apiKey,
    fromEmail: fromEmail || "",
  };
}
