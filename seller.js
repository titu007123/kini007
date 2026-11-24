(() => {
  "use strict";

  const config = window.KINIOO7_SUPABASE || {};
  const url = String(config.url || "").replace(/\/$/, "");
  const key = String(config.publishableKey || "");
  const message = document.querySelector("#authMessage");
  const profileMessage = document.querySelector("#profileMessage");
  const authPanel = document.querySelector("#authPanel");
  const profilePanel = document.querySelector("#profilePanel");
  const completePanel = document.querySelector("#completePanel");
  let supabaseClient = null;

  function showMessage(node, text, isError = false) {
    node.textContent = text;
    node.classList.toggle("error", isError);
  }
  function setBusy(form, busy) {
    const button = form.querySelector('button[type="submit"]');
    if (button) {
      button.disabled = busy;
      button.dataset.originalText ||= button.textContent;
      button.textContent = busy ? "Please wait…" : button.dataset.originalText;
    }
  }
  function showAuth() {
    authPanel.hidden = false;
    profilePanel.hidden = true;
    completePanel.hidden = true;
  }
  async function showSignedIn(user) {
    authPanel.hidden = true;
    completePanel.hidden = true;
    profilePanel.hidden = false;
    document.querySelector("#identityFile").required = true;
    const { data, error } = await supabaseClient
      .from("seller_profiles")
      .select("user_id,full_name,phone,shop_name,address,identity_type,identity_number,identity_document_path")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      showMessage(profileMessage, "Could not load profile: " + error.message, true);
      return;
    }
   if (data) {
  window.location.href = "seller-dashboard.html";
  return;
}
    showMessage(profileMessage, "Signed in. Complete your seller profile below.");
  }

  if (!url || !key || !window.supabase?.createClient) {
    showMessage(message, "Supabase configuration or SDK is missing. Check supabase-config.js.", true);
    document.querySelectorAll("form button[type=submit]").forEach(button => button.disabled = true);
    return;
  }
  supabaseClient = window.supabase.createClient(url, key);

  document.querySelector("#signupTab").addEventListener("click", () => {
    document.querySelector("#signupTab").classList.add("active");
    document.querySelector("#loginTab").classList.remove("active");
    document.querySelector("#signupForm").hidden = false;
    document.querySelector("#loginForm").hidden = true;
    showMessage(message, "");
  });
  document.querySelector("#loginTab").addEventListener("click", () => {
    document.querySelector("#loginTab").classList.add("active");
    document.querySelector("#signupTab").classList.remove("active");
    document.querySelector("#loginForm").hidden = false;
    document.querySelector("#signupForm").hidden = true;
    showMessage(message, "");
  });

  document.querySelector("#signupForm").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const email = document.querySelector("#signupEmail").value.trim();
    const password = document.querySelector("#signupPassword").value;
    const confirm = document.querySelector("#signupConfirm").value;
    if (password !== confirm) {
      showMessage(message, "Passwords do not match.", true);
      return;
    }
    setBusy(form, true);
    showMessage(message, "");
    try {
      const { data, error } = await supabaseClient.auth.signUp({ email, password });
      if (error) throw error;
      if (data.session && data.user) {
        await showSignedIn(data.user);
        showMessage(profileMessage, "Account created. Complete your seller profile.");
      } else {
        showMessage(message, "Account created. Check your email to verify the account, then return here and log in to complete your seller profile.");
      }
    } catch (error) {
      showMessage(message, error.message || "Could not create account.", true);
    } finally {
      setBusy(form, false);
    }
  });

  document.querySelector("#loginForm").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(form, true);
    showMessage(message, "");
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: document.querySelector("#loginEmail").value.trim(),
        password: document.querySelector("#loginPassword").value
      });
      if (error) throw error;
      await showSignedIn(data.user);
    } catch (error) {
      showMessage(message, error.message || "Login failed.", true);
    } finally {
      setBusy(form, false);
    }
  });

  document.querySelector("#forgotButton").addEventListener("click", async () => {
    const email = document.querySelector("#loginEmail").value.trim();
    if (!email) {
      showMessage(message, "Enter your email address first.", true);
      return;
    }
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    });
    showMessage(message, error ? error.message : "If this email is registered, a password reset link has been sent.");
  });

  document.querySelector("#profileForm").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const { data: authData } = await supabaseClient.auth.getUser();
    const user = authData?.user;
    if (!user) {
      showMessage(profileMessage, "Your session expired. Please log in again.", true);
      showAuth();
      return;
    }
    const file = document.querySelector("#identityFile").files[0];
    if (!file) {
      showMessage(profileMessage, "Select your NID or Passport file.", true);
      return;
    }
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type) || file.size > 5 * 1024 * 1024) {
      showMessage(profileMessage, "Use JPG, PNG, WEBP or PDF up to 5 MB.", true);
      return;
    }

    setBusy(form, true);
    showMessage(profileMessage, "Uploading your private identity document…");
    const ext = file.name.split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "");
    const objectPath = `${user.id}/${crypto.randomUUID()}.${ext || "bin"}`;
    try {
      const { error: uploadError } = await supabaseClient.storage
        .from("seller-identity-documents")
        .upload(objectPath, file, { upsert: false, contentType: file.type });
      if (uploadError) throw uploadError;

      const profile = {
        user_id: user.id,
        full_name: document.querySelector("#fullName").value.trim(),
        phone: document.querySelector("#phone").value.trim(),
        shop_name: document.querySelector("#shopName").value.trim(),
        address: document.querySelector("#address").value.trim(),
        identity_type: document.querySelector("#identityType").value,
        identity_number: document.querySelector("#identityNumber").value.trim(),
        identity_document_path: objectPath
      };
      const { error: saveError } = await supabaseClient
        .from("seller_profiles")
        .insert(profile);
      if (saveError) {
        await supabaseClient.storage.from("seller-identity-documents").remove([objectPath]);
        throw saveError;
      }
      profilePanel.hidden = true;
      completePanel.hidden = false;
      showMessage(profileMessage, "");
    } catch (error) {
      showMessage(profileMessage, error.message || "Could not save seller profile.", true);
    } finally {
      setBusy(form, false);
    }
  });

  async function logout() {
    await supabaseClient.auth.signOut();
    showAuth();
  }
  document.querySelector("#logoutButton").addEventListener("click", logout);
  document.querySelector("#completeLogout").addEventListener("click", logout);

  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (session?.user && (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "PASSWORD_RECOVERY")) {
      setTimeout(() => showSignedIn(session.user), 0);
    } else if (event === "SIGNED_OUT") {
      showAuth();
    }
  });
})();
