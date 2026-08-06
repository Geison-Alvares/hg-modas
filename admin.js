import { auth, db, storage } from './firebase-config.js';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-storage.js';

const loginSection = document.getElementById('loginSection');
const adminSection = document.getElementById('adminSection');
const loginForm = document.getElementById('loginForm');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');

const produtoForm = document.getElementById('produtoForm');
const produtoIdField = document.getElementById('produtoId');
const campoNome = document.getElementById('campoNome');
const campoPreco = document.getElementById('campoPreco');
const campoTamanhos = document.getElementById('campoTamanhos');
const campoTamanhoUnico = document.getElementById('campoTamanhoUnico');
const tamanhosWrapper = document.getElementById('tamanhosWrapper');
const campoCategoria = document.getElementById('campoCategoria');
const campoImagem = document.getElementById('campoImagem');
const previewAtual = document.getElementById('previewAtual');
const formTitle = document.getElementById('formTitle');
const submitBtn = document.getElementById('submitBtn');
const cancelarEdicaoBtn = document.getElementById('cancelarEdicaoBtn');
const formStatus = document.getElementById('formStatus');
const listaProdutos = document.getElementById('listaProdutos');

const produtosRef = collection(db, 'produtos');

const formatarPreco = (valor) =>
  Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ---------- Autenticação ----------

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    loginSection.hidden = false;
    adminSection.hidden = true;
    logoutBtn.hidden = true;
    return;
  }

  const adminSnap = await getDoc(doc(db, 'admins', user.uid));
  if (!adminSnap.exists()) {
    loginError.textContent = 'Essa conta não tem permissão de administrador.';
    loginError.hidden = false;
    await signOut(auth);
    return;
  }

  loginSection.hidden = true;
  adminSection.hidden = false;
  logoutBtn.hidden = false;
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginError.hidden = true;

  try {
    await signInWithEmailAndPassword(auth, loginEmail.value, loginPassword.value);
    loginForm.reset();
  } catch {
    loginError.textContent = 'E-mail ou senha inválidos.';
    loginError.hidden = false;
  }
});

logoutBtn.addEventListener('click', () => signOut(auth));

// ---------- Formulário de produto ----------

function aplicarTamanhoUnico(ativo) {
  tamanhosWrapper.hidden = ativo;
  campoTamanhos.required = !ativo;
  if (ativo) campoTamanhos.value = 'Único';
}

campoTamanhoUnico.addEventListener('change', () => {
  aplicarTamanhoUnico(campoTamanhoUnico.checked);
});

function limparFormulario() {
  produtoForm.reset();
  produtoIdField.value = '';
  previewAtual.hidden = true;
  formTitle.textContent = 'Adicionar produto';
  submitBtn.textContent = 'Salvar produto';
  cancelarEdicaoBtn.hidden = true;
  aplicarTamanhoUnico(false);
}

cancelarEdicaoBtn.addEventListener('click', limparFormulario);

produtoForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  submitBtn.disabled = true;
  formStatus.hidden = true;

  try {
    const id = produtoIdField.value;
    const dados = {
      nome: campoNome.value.trim(),
      preco: Number(campoPreco.value),
      tamanhosDisponiveis: campoTamanhoUnico.checked
        ? ['Único']
        : campoTamanhos.value
            .split(',')
            .map((tamanho) => tamanho.trim())
            .filter(Boolean),
      categoria: campoCategoria.value
    };

    const arquivo = campoImagem.files[0];
    if (arquivo) {
      const caminho = `produtos/${crypto.randomUUID()}-${arquivo.name}`;
      const imagemRef = ref(storage, caminho);
      await uploadBytes(imagemRef, arquivo);
      dados.imagem = await getDownloadURL(imagemRef);
    }

    if (id) {
      await updateDoc(doc(db, 'produtos', id), dados);
    } else {
      if (!arquivo) throw new Error('Selecione uma foto para o novo produto.');
      dados.criadoEm = serverTimestamp();
      await addDoc(produtosRef, dados);
    }

    formStatus.textContent = 'Produto salvo com sucesso!';
    formStatus.hidden = false;
    limparFormulario();
  } catch (erro) {
    formStatus.textContent = `Erro ao salvar: ${erro.message}`;
    formStatus.hidden = false;
  } finally {
    submitBtn.disabled = false;
  }
});

function preencherFormularioParaEdicao(produto) {
  produtoIdField.value = produto.id;
  campoNome.value = produto.nome;
  campoPreco.value = produto.preco;

  const ehTamanhoUnico = produto.tamanhosDisponiveis.length === 1 && produto.tamanhosDisponiveis[0] === 'Único';
  campoTamanhoUnico.checked = ehTamanhoUnico;
  aplicarTamanhoUnico(ehTamanhoUnico);
  campoTamanhos.value = produto.tamanhosDisponiveis.join(', ');

  campoCategoria.value = produto.categoria;
  campoImagem.value = '';
  previewAtual.src = produto.imagem;
  previewAtual.hidden = false;
  formTitle.textContent = 'Editar produto';
  submitBtn.textContent = 'Atualizar produto';
  cancelarEdicaoBtn.hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function excluirProduto(produto) {
  const confirmar = confirm(`Excluir "${produto.nome}"? Essa ação não pode ser desfeita.`);
  if (!confirmar) return;

  await deleteDoc(doc(db, 'produtos', produto.id));

  if (produto.imagem) {
    try {
      await deleteObject(ref(storage, produto.imagem));
    } catch {
      // a imagem pode já não existir no Storage; ignora o erro
    }
  }
}

// ---------- Lista de produtos ----------

function renderizarLista(produtos) {
  listaProdutos.innerHTML = '';

  if (produtos.length === 0) {
    listaProdutos.innerHTML = '<p>Nenhum produto cadastrado ainda.</p>';
    return;
  }

  produtos.forEach((produto) => {
    const item = document.createElement('div');
    item.className = 'admin-product';
    item.innerHTML = `
      <img src="${produto.imagem}" alt="${produto.nome}">
      <div class="admin-product__info">
        <strong>${produto.nome}</strong>
        <span>${produto.categoria} · ${produto.tamanhosDisponiveis.join(', ')}</span>
        <span>${formatarPreco(produto.preco)}</span>
      </div>
      <div class="admin-product__actions">
        <button type="button" class="btn admin-edit">Editar</button>
        <button type="button" class="btn admin-delete">Excluir</button>
      </div>
    `;
    item.querySelector('.admin-edit').addEventListener('click', () => preencherFormularioParaEdicao(produto));
    item.querySelector('.admin-delete').addEventListener('click', () => excluirProduto(produto));
    listaProdutos.appendChild(item);
  });
}

onSnapshot(produtosRef, (snapshot) => {
  const produtos = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  renderizarLista(produtos);
});
