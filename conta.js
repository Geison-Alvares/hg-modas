import { auth, db } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  verifyBeforeUpdateEmail,
  PhoneAuthProvider,
  RecaptchaVerifier,
  linkWithCredential,
  updatePhoneNumber
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import {
  doc,
  getDoc,
  setDoc
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

const accountToggle = document.getElementById('accountToggle');
const accountDrawer = document.getElementById('accountDrawer');
const accountOverlay = document.getElementById('accountOverlay');
const accountClose = document.getElementById('accountClose');

const authSection = document.getElementById('authSection');
const profileSection = document.getElementById('profileSection');

const tabLogin = document.getElementById('tabLogin');
const tabSignup = document.getElementById('tabSignup');
const loginForm = document.getElementById('clienteLoginForm');
const signupForm = document.getElementById('clienteSignupForm');
const authError = document.getElementById('clienteAuthError');

const profileForm = document.getElementById('profileForm');
const profileNome = document.getElementById('profileNome');
const profileTelefone = document.getElementById('profileTelefone');
const profileEndereco = document.getElementById('profileEndereco');
const profileEmail = document.getElementById('profileEmail');
const profileStatus = document.getElementById('profileStatus');
const alterarDadosBtn = document.getElementById('alterarDadosBtn');
const salvarDadosBtn = document.getElementById('salvarDadosBtn');
const cancelarEdicaoPerfilBtn = document.getElementById('cancelarEdicaoPerfilBtn');
const clienteLogoutBtn = document.getElementById('clienteLogoutBtn');
const googleSignInBtn = document.getElementById('googleSignInBtn');
const accountIconSvg = document.getElementById('accountIconSvg');
const accountNameEl = document.getElementById('accountName');

const accountMenu = document.getElementById('accountMenu');
const accountMenuNome = document.getElementById('accountMenuNome');
const accountMenuEmail = document.getElementById('accountMenuEmail');
const menuDadosBtn = document.getElementById('menuDadosBtn');
const menuSairBtn = document.getElementById('menuSairBtn');

const telefoneCodigoSection = document.getElementById('telefoneCodigoSection');
const codigoSmsInput = document.getElementById('codigoSmsInput');
const confirmarCodigoBtn = document.getElementById('confirmarCodigoBtn');
const reenviarCodigoBtn = document.getElementById('reenviarCodigoBtn');
const cancelarCodigoBtn = document.getElementById('cancelarCodigoBtn');
const codigoSmsStatus = document.getElementById('codigoSmsStatus');

const camposPerfil = [profileNome, profileTelefone, profileEndereco, profileEmail];

const googleProvider = new GoogleAuthProvider();

let perfilAtual = null;
let recaptchaVerifier = null;
let verificationIdAtual = null;

export function obterPerfilCliente() {
  return perfilAtual;
}

function atualizarNomeNoHeader(perfil, emailFallback) {
  const primeiroNome = (perfil?.nome || '').trim().split(' ')[0];
  const exibicao = primeiroNome || emailFallback || '';

  if (!accountNameEl || !accountIconSvg) return;

  if (exibicao) {
    accountNameEl.textContent = exibicao;
    accountNameEl.hidden = false;
    accountIconSvg.hidden = true;
  } else {
    accountNameEl.hidden = true;
    accountIconSvg.hidden = false;
  }
}

function atualizarMenuDropdown(perfil, emailFallback) {
  if (!accountMenuNome || !accountMenuEmail) return;
  accountMenuNome.textContent = perfil?.nome || 'Minha conta';
  accountMenuEmail.textContent = perfil?.email || emailFallback || '';
}

// ---------- Painel lateral ----------

function abrirConta() {
  document.getElementById('cartDrawer')?.classList.remove('is-open');
  document.getElementById('cartOverlay')?.classList.remove('is-open');

  accountDrawer.classList.add('is-open');
  accountOverlay.classList.add('is-open');
}

function fecharConta() {
  accountDrawer.classList.remove('is-open');
  accountOverlay.classList.remove('is-open');
}

accountToggle?.addEventListener('click', () => {
  if (auth.currentUser) {
    accountMenu.hidden = !accountMenu.hidden;
  } else {
    abrirConta();
  }
});

accountClose?.addEventListener('click', fecharConta);
accountOverlay?.addEventListener('click', fecharConta);

document.addEventListener('click', (event) => {
  if (!accountMenu || accountMenu.hidden) return;
  if (accountMenu.contains(event.target) || accountToggle.contains(event.target)) return;
  accountMenu.hidden = true;
});

menuDadosBtn?.addEventListener('click', () => {
  accountMenu.hidden = true;
  entrarModoVisualizacao();
  abrirConta();
});

menuSairBtn?.addEventListener('click', () => {
  accountMenu.hidden = true;
  signOut(auth);
});

// ---------- Abas Entrar / Criar conta ----------

tabLogin?.addEventListener('click', () => {
  tabLogin.classList.add('is-active');
  tabSignup.classList.remove('is-active');
  loginForm.hidden = false;
  signupForm.hidden = true;
  authError.hidden = true;
});

tabSignup?.addEventListener('click', () => {
  tabSignup.classList.add('is-active');
  tabLogin.classList.remove('is-active');
  signupForm.hidden = false;
  loginForm.hidden = true;
  authError.hidden = true;
});

// ---------- Login com Google ----------

googleSignInBtn?.addEventListener('click', async () => {
  authError.hidden = true;

  try {
    const credencial = await signInWithPopup(auth, googleProvider);
    const clienteRef = doc(db, 'clientes', credencial.user.uid);
    const snap = await getDoc(clienteRef);

    if (!snap.exists()) {
      await setDoc(clienteRef, {
        nome: credencial.user.displayName || '',
        telefone: '',
        email: credencial.user.email || '',
        endereco: ''
      });
    }
  } catch (erro) {
    if (erro.code !== 'auth/popup-closed-by-user') {
      authError.textContent = 'Não foi possível entrar com Google.';
      authError.hidden = false;
    }
  }
});

// ---------- Login ----------

loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  authError.hidden = true;

  try {
    await signInWithEmailAndPassword(
      auth,
      document.getElementById('loginClienteEmail').value,
      document.getElementById('loginClienteSenha').value
    );
    loginForm.reset();
  } catch {
    authError.textContent = 'E-mail ou senha inválidos.';
    authError.hidden = false;
  }
});

// ---------- Criar conta ----------

signupForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  authError.hidden = true;

  const nome = document.getElementById('signupNome').value.trim();
  const telefone = document.getElementById('signupTelefone').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const senha = document.getElementById('signupSenha').value;

  try {
    const credencial = await createUserWithEmailAndPassword(auth, email, senha);
    await setDoc(doc(db, 'clientes', credencial.user.uid), {
      nome,
      telefone,
      email,
      endereco: ''
    });
    signupForm.reset();
  } catch (erro) {
    authError.textContent = `Não foi possível criar a conta: ${erro.message}`;
    authError.hidden = false;
  }
});

// ---------- Perfil (visualizar / editar) ----------

function entrarModoVisualizacao() {
  camposPerfil.forEach((campo) => { campo.disabled = true; });
  alterarDadosBtn.hidden = false;
  salvarDadosBtn.hidden = true;
  cancelarEdicaoPerfilBtn.hidden = true;
  profileStatus.hidden = true;
}

function entrarModoEdicao() {
  camposPerfil.forEach((campo) => { campo.disabled = false; });
  alterarDadosBtn.hidden = true;
  salvarDadosBtn.hidden = false;
  cancelarEdicaoPerfilBtn.hidden = false;
}

function preencherFormularioPerfil(perfil) {
  profileNome.value = perfil?.nome || '';
  profileTelefone.value = perfil?.telefone || '';
  profileEndereco.value = perfil?.endereco || '';
  profileEmail.value = perfil?.email || '';
}

// ---------- Verificação de e-mail ----------

async function iniciarVerificacaoEmail(novoEmail) {
  try {
    await verifyBeforeUpdateEmail(auth.currentUser, novoEmail);
    profileStatus.textContent = 'Enviamos um link de confirmação para o novo e-mail. Confirme para efetivar a troca.';
    profileStatus.hidden = false;
  } catch (erro) {
    profileStatus.textContent =
      erro.code === 'auth/requires-recent-login'
        ? 'Por segurança, saia e entre novamente antes de trocar o e-mail.'
        : `Não foi possível trocar o e-mail: ${erro.message}`;
    profileStatus.hidden = false;
  }
}

// ---------- Verificação de celular por SMS ----------

function paraE164(numero) {
  const digitos = numero.replace(/\D/g, '');
  return digitos.startsWith('55') ? `+${digitos}` : `+55${digitos}`;
}

function obterRecaptcha() {
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
  }
  recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
  return recaptchaVerifier;
}

async function iniciarVerificacaoTelefone(novoTelefone) {
  try {
    const phoneProvider = new PhoneAuthProvider(auth);
    verificationIdAtual = await phoneProvider.verifyPhoneNumber(paraE164(novoTelefone), obterRecaptcha());
    codigoSmsInput.value = '';
    codigoSmsStatus.hidden = true;
    telefoneCodigoSection.hidden = false;
  } catch (erro) {
    profileStatus.textContent = `Não foi possível enviar o SMS: ${erro.message}`;
    profileStatus.hidden = false;
  }
}

confirmarCodigoBtn?.addEventListener('click', async () => {
  codigoSmsStatus.hidden = true;

  try {
    const credential = PhoneAuthProvider.credential(verificationIdAtual, codigoSmsInput.value.trim());

    try {
      await linkWithCredential(auth.currentUser, credential);
    } catch (erro) {
      if (erro.code === 'auth/provider-already-linked' || erro.code === 'auth/credential-already-in-use') {
        await updatePhoneNumber(auth.currentUser, credential);
      } else {
        throw erro;
      }
    }

    const user = auth.currentUser;
    const novoTelefone = profileTelefone.value.trim();
    await setDoc(doc(db, 'clientes', user.uid), { telefone: novoTelefone }, { merge: true });
    perfilAtual = { ...perfilAtual, telefone: novoTelefone };

    telefoneCodigoSection.hidden = true;
    entrarModoVisualizacao();
    profileStatus.textContent = 'Celular verificado e atualizado!';
    profileStatus.hidden = false;
  } catch (erro) {
    codigoSmsStatus.textContent = `Código inválido: ${erro.message}`;
    codigoSmsStatus.hidden = false;
  }
});

reenviarCodigoBtn?.addEventListener('click', async () => {
  codigoSmsStatus.hidden = true;
  reenviarCodigoBtn.disabled = true;
  await iniciarVerificacaoTelefone(profileTelefone.value.trim());
  reenviarCodigoBtn.disabled = false;
});

cancelarCodigoBtn?.addEventListener('click', () => {
  telefoneCodigoSection.hidden = true;
  codigoSmsInput.value = '';
  preencherFormularioPerfil(perfilAtual);
});

alterarDadosBtn?.addEventListener('click', entrarModoEdicao);

cancelarEdicaoPerfilBtn?.addEventListener('click', () => {
  preencherFormularioPerfil(perfilAtual);
  entrarModoVisualizacao();
});

clienteLogoutBtn?.addEventListener('click', () => signOut(auth));

profileForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const user = auth.currentUser;
  if (!user) return;

  profileStatus.hidden = true;
  salvarDadosBtn.disabled = true;

  const novoNome = profileNome.value.trim();
  const novoEndereco = profileEndereco.value.trim();
  const novoTelefone = profileTelefone.value.trim();
  const novoEmail = profileEmail.value.trim();

  const emailMudou = novoEmail !== (perfilAtual?.email || '');
  const telefoneMudou = novoTelefone !== (perfilAtual?.telefone || '');

  try {
    await setDoc(
      doc(db, 'clientes', user.uid),
      { nome: novoNome, endereco: novoEndereco },
      { merge: true }
    );
    perfilAtual = { ...perfilAtual, nome: novoNome, endereco: novoEndereco };
    atualizarNomeNoHeader(perfilAtual, user.email);
    atualizarMenuDropdown(perfilAtual, user.email);

    if (emailMudou) {
      await iniciarVerificacaoEmail(novoEmail);
    }

    if (telefoneMudou) {
      await iniciarVerificacaoTelefone(novoTelefone);
      return;
    }

    entrarModoVisualizacao();
    if (!emailMudou) {
      profileStatus.textContent = 'Dados salvos!';
      profileStatus.hidden = false;
    }
  } catch (erro) {
    profileStatus.textContent = `Erro ao salvar: ${erro.message}`;
    profileStatus.hidden = false;
  } finally {
    salvarDadosBtn.disabled = false;
  }
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    perfilAtual = null;
    authSection.hidden = false;
    profileSection.hidden = true;
    accountMenu.hidden = true;
    atualizarNomeNoHeader(null, null);
    return;
  }

  authSection.hidden = true;
  profileSection.hidden = false;

  const snap = await getDoc(doc(db, 'clientes', user.uid));
  perfilAtual = snap.exists()
    ? snap.data()
    : { nome: '', telefone: '', endereco: '', email: user.email };

  if (user.email && perfilAtual.email !== user.email) {
    perfilAtual = { ...perfilAtual, email: user.email };
    await setDoc(doc(db, 'clientes', user.uid), { email: user.email }, { merge: true });
  }

  preencherFormularioPerfil(perfilAtual);
  entrarModoVisualizacao();
  atualizarNomeNoHeader(perfilAtual, user.email);
  atualizarMenuDropdown(perfilAtual, user.email);
});
