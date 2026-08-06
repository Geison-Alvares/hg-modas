import { db } from './firebase-config.js';
import {
  collection,
  onSnapshot
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

const STORAGE_KEY = 'nora:carrinho';

// TODO: preencha com o número de WhatsApp da loja (código do país + DDD + número, só dígitos)
const NUMERO_WHATSAPP_LOJA = '5566996955065';

const grid = document.getElementById('productGrid');
const badge = document.querySelector('.header__icons .badge');
const menu = document.getElementById('nav-menu');

const cartToggle = document.getElementById('cartToggle');
const cartDrawer = document.getElementById('cartDrawer');
const cartOverlay = document.getElementById('cartOverlay');
const cartClose = document.getElementById('cartClose');
const cartItemsEl = document.getElementById('cartItems');
const cartTotalEl = document.getElementById('cartTotal');
const checkoutForm = document.getElementById('checkoutForm');

const formatarPreco = (valor) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ---------- Carrinho (localStorage) ----------

function carregarCarrinho() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

function salvarCarrinho(carrinho) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(carrinho));
}

function atualizarBadge(carrinho) {
  const totalItens = carrinho.reduce((soma, item) => soma + item.quantidade, 0);
  if (badge) badge.textContent = totalItens;
}

function adicionarAoCarrinho(produto, tamanho) {
  const carrinho = carregarCarrinho();
  const itemExistente = carrinho.find(
    (item) => item.id === produto.id && item.tamanho === tamanho
  );

  if (itemExistente) {
    itemExistente.quantidade += 1;
  } else {
    carrinho.push({
      id: produto.id,
      nome: produto.nome,
      preco: produto.preco,
      imagem: produto.imagem,
      tamanho,
      quantidade: 1
    });
  }

  salvarCarrinho(carrinho);
  atualizarBadge(carrinho);
  renderizarCarrinho();
}

function removerDoCarrinho(index) {
  const carrinho = carregarCarrinho();
  carrinho.splice(index, 1);
  salvarCarrinho(carrinho);
  atualizarBadge(carrinho);
  renderizarCarrinho();
}

// ---------- Painel lateral do carrinho ----------

function abrirCarrinho() {
  cartDrawer.classList.add('is-open');
  cartOverlay.classList.add('is-open');
  renderizarCarrinho();
}

function fecharCarrinho() {
  cartDrawer.classList.remove('is-open');
  cartOverlay.classList.remove('is-open');
}

cartToggle?.addEventListener('click', abrirCarrinho);
cartClose?.addEventListener('click', fecharCarrinho);
cartOverlay?.addEventListener('click', fecharCarrinho);

function renderizarCarrinho() {
  const carrinho = carregarCarrinho();
  cartItemsEl.innerHTML = '';

  if (carrinho.length === 0) {
    cartItemsEl.innerHTML = '<p class="cart-empty">Sua sacola está vazia.</p>';
    cartTotalEl.textContent = formatarPreco(0);
    return;
  }

  let total = 0;

  carrinho.forEach((item, index) => {
    const subtotal = item.preco * item.quantidade;
    total += subtotal;

    const linha = document.createElement('div');
    linha.className = 'cart-item';
    linha.innerHTML = `
      <div class="cart-item__info">
        <strong>${item.nome}</strong>
        <span>Tamanho: ${item.tamanho} · ${item.quantidade}x ${formatarPreco(item.preco)}</span>
      </div>
      <button type="button" class="cart-item__remove" aria-label="Remover item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 7h16"/>
          <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/>
        </svg>
      </button>
    `;
    linha.querySelector('.cart-item__remove').addEventListener('click', () => removerDoCarrinho(index));
    cartItemsEl.appendChild(linha);
  });

  cartTotalEl.textContent = formatarPreco(total);
}

// ---------- Finalizar pedido via WhatsApp ----------

function montarMensagemPedido(carrinho, cliente) {
  const linhasItens = carrinho.map((item, index) => {
    const subtotal = item.preco * item.quantidade;
    return `${index + 1}. ${item.nome} (Tam. ${item.tamanho}) — ${item.quantidade}x ${formatarPreco(item.preco)} = ${formatarPreco(subtotal)}`;
  });

  const total = carrinho.reduce((soma, item) => soma + item.preco * item.quantidade, 0);

  const partes = [
    '*Novo pedido — HG Modas*',
    '',
    '*Itens:*',
    ...linhasItens,
    '',
    `*Total: ${formatarPreco(total)}*`,
    '',
    '*Dados do cliente:*',
    `Nome: ${cliente.nome}`,
    `Telefone: ${cliente.telefone}`
  ];

  if (cliente.endereco) {
    partes.push(`Endereço: ${cliente.endereco}`);
  }

  return partes.join('\n');
}

function finalizarCompra(carrinho, cliente) {
  const mensagem = montarMensagemPedido(carrinho, cliente);
  const link = `https://wa.me/${NUMERO_WHATSAPP_LOJA}?text=${encodeURIComponent(mensagem)}`;
  window.open(link, '_blank');
}

checkoutForm?.addEventListener('submit', (event) => {
  event.preventDefault();

  const carrinho = carregarCarrinho();
  if (carrinho.length === 0) {
    alert('Sua sacola está vazia.');
    return;
  }

  const cliente = {
    nome: document.getElementById('clienteNome').value.trim(),
    telefone: document.getElementById('clienteTelefone').value.trim(),
    endereco: document.getElementById('clienteEndereco').value.trim()
  };

  finalizarCompra(carrinho, cliente);
});

// ---------- Renderização de produtos + filtro por categoria ----------

function criarCard(produto, index) {
  const card = document.createElement('article');
  card.className = 'product-card';
  card.dataset.id = produto.id;

  const tamanhoUnico = produto.tamanhosDisponiveis.length === 1;

  card.innerHTML = `
    <div class="product-card__image product-card__image--${(index % 6) + 1}">
      <img src="${produto.imagem}" alt="${produto.nome}" loading="lazy">
      <button class="fav-btn" type="button" aria-label="Favoritar">♡</button>
    </div>
    <div class="product-card__info">
      <h3>${produto.nome}</h3>
      <p class="product-card__category">${produto.categoria}</p>
      <span class="product-card__price">${formatarPreco(produto.preco)}</span>
      <div class="product-card__sizes" role="group" aria-label="Tamanhos disponíveis">
        ${
          tamanhoUnico
            ? `<span class="size-unico">Tamanho ${produto.tamanhosDisponiveis[0]}</span>`
            : produto.tamanhosDisponiveis
                .map((tamanho) => `<button type="button" class="size-btn" data-tamanho="${tamanho}">${tamanho}</button>`)
                .join('')
        }
      </div>
      <button type="button" class="btn btn--primary btn--add" ${tamanhoUnico ? '' : 'disabled'}>
        Adicionar à sacola
      </button>
    </div>
  `;

  const img = card.querySelector('img');
  img.addEventListener('error', () => img.remove());

  const sizeButtons = card.querySelectorAll('.size-btn');
  const addButton = card.querySelector('.btn--add');
  let tamanhoSelecionado = tamanhoUnico ? produto.tamanhosDisponiveis[0] : null;

  sizeButtons.forEach((botao) => {
    botao.addEventListener('click', () => {
      sizeButtons.forEach((b) => b.classList.remove('is-selected'));
      botao.classList.add('is-selected');
      tamanhoSelecionado = botao.dataset.tamanho;
      addButton.disabled = false;
    });
  });

  addButton.addEventListener('click', () => {
    if (!tamanhoSelecionado) return;
    adicionarAoCarrinho(produto, tamanhoSelecionado);
    addButton.textContent = 'Adicionado ✓';
    setTimeout(() => {
      addButton.textContent = 'Adicionar à sacola';
    }, 1200);
  });

  return card;
}

function renderizarProdutos(produtos) {
  if (!grid) return;
  grid.innerHTML = '';

  if (produtos.length === 0) {
    grid.innerHTML = '<p class="product-grid__empty">Nenhum produto encontrado nessa categoria.</p>';
    return;
  }

  produtos.forEach((produto, index) => {
    grid.appendChild(criarCard(produto, index));
  });
}

let produtosCache = [];
let categoriaAtiva = '';

function aplicarFiltro() {
  const produtosFiltrados = categoriaAtiva
    ? produtosCache.filter((produto) => produto.categoria === categoriaAtiva)
    : produtosCache;
  renderizarProdutos(produtosFiltrados);
}

const linksFiltro = document.querySelectorAll('.nav a[data-categoria]');
linksFiltro.forEach((link) => {
  link.addEventListener('click', () => {
    categoriaAtiva = link.dataset.categoria;
    aplicarFiltro();

    linksFiltro.forEach((l) => l.classList.remove('is-active'));
    link.classList.add('is-active');

    menu?.classList.remove('is-open');
  });
});

const produtosRef = collection(db, 'produtos');
onSnapshot(produtosRef, (snapshot) => {
  produtosCache = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  aplicarFiltro();
});

atualizarBadge(carregarCarrinho());
