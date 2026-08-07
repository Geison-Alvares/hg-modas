import { auth, db } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
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
const clienteLogoutBtn = document.getElementById('clienteLogoutBtn');
const googleSignInBtn = document.getElementById('googleSignInBtn');
const accountIconSvg = document.getElementById('accountIconSvg');
const accountNameEl = document.getElementById('accountName');

const googleProvider = new GoogleAuthProvider();

let perfilAtual = null;

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

accountToggle?.addEventListener('click', abrirConta);
accountClose?.addEventListener('click', fecharConta);
accountOverlay?.addEventListener('click', fecharConta);

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

// ---------- Perfil ----------

clienteLogoutBtn?.addEventListener('click', () => signOut(auth));

profileForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const user = auth.currentUser;
  if (!user) return;

  const dados = {
    nome: profileNome.value.trim(),
    telefone: profileTelefone.value.trim(),
    endereco: profileEndereco.value.trim(),
    email: user.email
  };

  await setDoc(doc(db, 'clientes', user.uid), dados, { merge: true });
  perfilAtual = dados;
  atualizarNomeNoHeader(perfilAtual, user.email);

  profileStatus.textContent = 'Dados salvos!';
  profileStatus.hidden = false;
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    perfilAtual = null;
    authSection.hidden = false;
    profileSection.hidden = true;
    atualizarNomeNoHeader(null, null);
    return;
  }

  authSection.hidden = true;
  profileSection.hidden = false;

  const snap = await getDoc(doc(db, 'clientes', user.uid));
  perfilAtual = snap.exists()
    ? snap.data()
    : { nome: '', telefone: '', endereco: '', email: user.email };

  profileNome.value = perfilAtual.nome || '';
  profileTelefone.value = perfilAtual.telefone || '';
  profileEndereco.value = perfilAtual.endereco || '';
  profileEmail.value = perfilAtual.email || user.email || '';
  atualizarNomeNoHeader(perfilAtual, user.email);
});
