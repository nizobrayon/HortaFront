const token = localStorage.getItem("sdce_token");
const usuario = JSON.parse(localStorage.getItem("sdce_usuario") || "null");

if (!token) {
  window.location.href = "index.html";
}

const API = "http://localhost:3000/api";

const userGreeting = document.getElementById("userGreeting");
const welcomeTitle = document.getElementById("welcomeTitle");
const logoutButton = document.getElementById("logoutButton");
const cards = document.querySelectorAll(".card");
const panelTitle = document.getElementById("panelTitle");
const panelBody = document.getElementById("panelBody");
const refreshButton = document.getElementById("refreshButton");

if (usuario) {
  userGreeting.textContent = `Olá, ${usuario.nome}`;
  welcomeTitle.textContent = `Bem-vindo, ${usuario.nome}!`;
}

let secaoAtiva = null;
let formAberto = false;
let produtoEmEdicao = null;
let msgProdutos = { texto: "", tipo: "" };

async function apiGet(caminho) {
  const resposta = await fetch(`${API}${caminho}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!resposta.ok) {
    throw new Error("Não foi possível carregar os dados.");
  }
  return resposta.json();
}

function escapeHtml(texto) {
  return String(texto ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function produtoFormHtml(produto) {
  const editando = Boolean(produto);
  const v = (valor, padrao = "") => escapeHtml(valor ?? padrao);
  return `
    <form id="produtoForm" class="produto-form">
      <input type="hidden" id="produtoId" value="${editando ? produto.id : ""}">
      <div class="form-grid">
        <label>Nome
          <input type="text" id="pNome" value="${v(produto?.nome)}" required>
        </label>
        <label>Categoria
          <input type="text" id="pCategoria" value="${v(produto?.categoria)}" required>
        </label>
        <label>Unidade
          <input type="text" id="pUnidade" value="${v(produto?.unidade, "unidade")}">
        </label>
        <label>Quantidade
          <input type="number" id="pQuantidade" min="0" value="${editando ? Number(produto.quantidade) : 0}">
        </label>
        <label>Estoque mínimo
          <input type="number" id="pEstoqueMinimo" min="0" value="${editando ? Number(produto.estoque_minimo) : 5}">
        </label>
        <label>Preço (R$)
          <input type="number" id="pPreco" min="0" step="0.01" value="${editando ? Number(produto.preco) : 0}">
        </label>
      </div>
      <div class="form-actions">
        <button type="submit">${editando ? "Salvar alterações" : "Cadastrar"}</button>
        <button type="button" class="btn-secondary" id="cancelarProduto">Cancelar</button>
      </div>
    </form>`;
}

async function renderProdutos() {
  panelTitle.textContent = "Produtos";
  panelBody.innerHTML = '<p class="placeholder">Carregando...</p>';

  let produtos;
  try {
    produtos = await apiGet("/produtos");
  } catch (error) {
    panelBody.innerHTML = '<p class="placeholder">Erro ao carregar produtos.</p>';
    return;
  }

  const mensagem = msgProdutos.texto
    ? `<p class="msg ${msgProdutos.tipo}">${escapeHtml(msgProdutos.texto)}</p>`
    : "";

  const toolbar = `
    <div class="toolbar">
      <button type="button" id="novoProduto">+ Novo Produto</button>
    </div>`;

  const form = formAberto ? produtoFormHtml(produtoEmEdicao) : "";

  let tabela;
  if (produtos.length === 0) {
    tabela = '<p class="placeholder">Nenhum produto cadastrado ainda.</p>';
  } else {
    const linhas = produtos.map((p) => `
      <tr>
        <td>${escapeHtml(p.nome)}</td>
        <td>${escapeHtml(p.categoria)}</td>
        <td>${escapeHtml(p.unidade)}</td>
        <td>${Number(p.quantidade)}</td>
        <td>R$ ${Number(p.preco).toFixed(2)}</td>
        <td class="acoes">
          <button type="button" class="btn-mini" data-editar="${p.id}">Editar</button>
          <button type="button" class="btn-mini btn-danger" data-excluir="${p.id}">Excluir</button>
        </td>
      </tr>`).join("");
    tabela = `
      <table>
        <thead>
          <tr><th>Nome</th><th>Categoria</th><th>Unidade</th><th>Qtd.</th><th>Preço</th><th>Ações</th></tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table>`;
  }

  panelBody.innerHTML = toolbar + mensagem + form + tabela;

  document.getElementById("novoProduto").addEventListener("click", () => {
    formAberto = true;
    produtoEmEdicao = null;
    msgProdutos = { texto: "", tipo: "" };
    renderProdutos();
  });

  if (formAberto) {
    document.getElementById("produtoForm").addEventListener("submit", salvarProduto);
    document.getElementById("cancelarProduto").addEventListener("click", () => {
      formAberto = false;
      produtoEmEdicao = null;
      renderProdutos();
    });
  }

  panelBody.querySelectorAll("[data-editar]").forEach((botao) => {
    botao.addEventListener("click", () => {
      const id = Number(botao.dataset.editar);
      produtoEmEdicao = produtos.find((p) => p.id === id);
      formAberto = true;
      msgProdutos = { texto: "", tipo: "" };
      renderProdutos();
    });
  });

  panelBody.querySelectorAll("[data-excluir]").forEach((botao) => {
    botao.addEventListener("click", () => excluirProduto(Number(botao.dataset.excluir)));
  });
}

async function salvarProduto(event) {
  event.preventDefault();
  const id = document.getElementById("produtoId").value;
  const dados = {
    nome: document.getElementById("pNome").value.trim(),
    categoria: document.getElementById("pCategoria").value.trim(),
    unidade: document.getElementById("pUnidade").value.trim() || "unidade",
    quantidade: Number(document.getElementById("pQuantidade").value) || 0,
    estoque_minimo: Number(document.getElementById("pEstoqueMinimo").value) || 0,
    preco: Number(document.getElementById("pPreco").value) || 0,
  };

  try {
    const resposta = await fetch(`${API}/produtos${id ? "/" + id : ""}`, {
      method: id ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(dados)
    });
    const resultado = await resposta.json();

    if (!resposta.ok) {
      msgProdutos = { texto: resultado.mensagem || "Erro ao salvar produto.", tipo: "erro" };
      await renderProdutos();
      return;
    }

    msgProdutos = { texto: resultado.mensagem || "Produto salvo com sucesso!", tipo: "ok" };
    formAberto = false;
    produtoEmEdicao = null;
    await renderProdutos();
  } catch (error) {
    msgProdutos = {
      texto: "Não foi possível salvar. Confira se o backend está ligado.",
      tipo: "erro"
    };
    await renderProdutos();
  }
}

async function excluirProduto(id) {
  if (!confirm("Tem certeza que deseja excluir este produto?")) return;

  try {
    const resposta = await fetch(`${API}/produtos/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    const resultado = await resposta.json();

    msgProdutos = resposta.ok
      ? { texto: resultado.mensagem || "Produto excluído com sucesso!", tipo: "ok" }
      : { texto: resultado.mensagem || "Erro ao excluir produto.", tipo: "erro" };

    if (produtoEmEdicao && produtoEmEdicao.id === id) {
      produtoEmEdicao = null;
      formAberto = false;
    }
    await renderProdutos();
  } catch (error) {
    msgProdutos = {
      texto: "Não foi possível excluir. Confira se o backend está ligado.",
      tipo: "erro"
    };
    await renderProdutos();
  }
}

async function renderEstoque() {
  panelTitle.textContent = "Estoque";
  panelBody.innerHTML = '<p class="placeholder">Carregando...</p>';
  try {
    const produtos = await apiGet("/produtos");
    const totalItens = produtos.length;
    const totalUnidades = produtos.reduce((soma, p) => soma + Number(p.quantidade), 0);
    const estoqueBaixo = produtos.filter(
      (p) => Number(p.quantidade) < Number(p.estoque_minimo)
    );

    let html = `
      <div class="summary">
        <div class="box"><div class="value">${totalItens}</div><div class="label">Produtos cadastrados</div></div>
        <div class="box"><div class="value">${totalUnidades}</div><div class="label">Unidades em estoque</div></div>
        <div class="box"><div class="value">${estoqueBaixo.length}</div><div class="label">Com estoque baixo</div></div>
      </div>`;

    const linhas = produtos.map((p) => `
      <tr>
        <td>${escapeHtml(p.nome)}</td>
        <td>${Number(p.quantidade)}</td>
      </tr>`).join("");
    html += `
      <table>
        <thead><tr><th>Produto</th><th>Qtd. em estoque</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>`;
    panelBody.innerHTML = html;
  } catch (error) {
    panelBody.innerHTML = '<p class="placeholder">Erro ao carregar estoque.</p>';
  }
}

function getVendas() {
  return JSON.parse(localStorage.getItem("sdce_vendas") || "[]");
}
function salvarVendas(vendas) {
  localStorage.setItem("sdce_vendas", JSON.stringify(vendas));
}

async function renderRelatorios() {
  panelTitle.textContent = "Relatórios";
  const vendas = getVendas();
  const totalVendas = vendas.length;
  const totalReais = vendas.reduce((s, v) => s + Number(v.valor), 0);
  const qtdProdutos = vendas.reduce((s, v) => s + Number(v.quantidade), 0);
  panelBody.innerHTML = `
    <div class="summary">
      <div class="box"><div class="value">${totalVendas}</div><div class="label">Quantidade de vendas</div></div>
      <div class="box"><div class="value">R$ ${totalReais.toFixed(2)}</div><div class="label">Total vendido (R$)</div></div>
      <div class="box"><div class="value">${qtdProdutos}</div><div class="label">Unidades vendidas</div></div>
    </div>`;
}
async function renderEntradas() {
  panelTitle.textContent = "Entradas";
  panelBody.innerHTML = '<p class="placeholder">Carregando...</p>';
  let produtos = [];
  try { produtos = await apiGet("/produtos"); } catch (e) { produtos = []; }
  const opcoes = produtos.map((p) => `<option value="${p.id}">${escapeHtml(p.nome)}</option>`).join("");
  panelBody.innerHTML = `
    <form id="entradaForm" class="produto-form">
      <div class="form-grid">
        <label>Produto
          <select id="eProduto" required>${opcoes || '<option value="">Sem produtos</option>'}</select>
        </label>
        <label>Quantidade
          <input type="number" id="eQtd" min="1" value="1" required>
        </label>
        <label>Observação
          <input type="text" id="eObs">
        </label>
      </div>
      <div class="form-actions"><button type="submit">Registrar entrada</button></div>
    </form>`;
  document.getElementById("entradaForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const produtoId = Number(document.getElementById("eProduto").value);
    const quantidade = Number(document.getElementById("eQtd").value) || 1;
    const observacao = document.getElementById("eObs").value.trim();
    const produto = produtos.find((p) => p.id === produtoId);
    if (!produto) return;
    try {
      await fetch(`${API}/entradas`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ produto_id: produtoId, quantidade, observacao })
      });
      await fetch(`${API}/produtos/${produtoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...produto, quantidade: Number(produto.quantidade) + quantidade })
      });
      await renderEntradas();
    } catch (err) { alert("Erro ao registrar entrada."); }
  });
}
async function renderVendas() {
  panelTitle.textContent = "Vendas";
  try {
    produtos = await apiGet("/produtos");
  } catch (e) {
    produtos = JSON.parse(localStorage.getItem("sdce_produtos") || "[]");
  }

  const opcoes = produtos.map((p) => `<option value="${p.id}">${escapeHtml(p.nome)} (qtd: ${Number(p.quantidade)})</option>`).join("");

  const vendas = getVendas();
  const linhas = vendas.map((v, i) => `
    <tr>
      <td>${escapeHtml(v.vendedor)}</td>
      <td>${escapeHtml(v.cliente)}</td>
      <td>${escapeHtml(v.produtoNome)}</td>
      <td>${Number(v.quantidade)}</td>
      <td>R$ ${Number(v.valor).toFixed(2)}</td>
      <td>${escapeHtml(v.data)}</td>
      <td><button type="button" class="btn-mini btn-danger" data-delvenda="${i}">Excluir</button></td>
    </tr>`).join("");

  panelBody.innerHTML = `
    <form id="vendaForm" class="produto-form">
      <div class="form-grid">
        <label>Vendedor
          <input type="text" id="vVendedor" required>
        </label>
        <label>Cliente
          <input type="text" id="vCliente" required>
        </label>
        <label>Produto
          <select id="vProduto" required>${opcoes || '<option value="">Sem produtos</option>'}</select>
        </label>
        <label>Quantidade
          <input type="number" id="vQuantidade" min="1" value="1" required>
        </label>
        <label>Valor (R$)
          <input type="number" id="vValor" min="0" step="0.01" required>
        </label>
      </div>
      <div class="form-actions">
        <button type="submit">Registrar venda</button>
      </div>
    </form>
    <h3>Histórico de vendas</h3>
    ${vendas.length === 0 ? '<p class="placeholder">Nenhuma venda registrada.</p>' : `
      <table>
        <thead><tr><th>Vendedor</th><th>Cliente</th><th>Produto</th><th>Qtd.</th><th>Valor</th><th>Data</th><th>Ações</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>`}`;

  document.querySelectorAll("[data-delvenda]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const idx = Number(btn.dataset.delvenda);
      const lista = getVendas();
      const venda = lista[idx];
      if (venda && venda.id) {
    let resVenda = {};
    try {
          await fetch(`${API}/vendas/${venda.id}/cancelar`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (e) {}
      }
      lista.splice(idx, 1);
      salvarVendas(lista);
      renderVendas();
    });
  });

  document.getElementById("vendaForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const vendedor = document.getElementById("vVendedor").value.trim();
    const cliente = document.getElementById("vCliente").value.trim();
    const produtoId = Number(document.getElementById("vProduto").value);
    const quantidade = Number(document.getElementById("vQuantidade").value) || 1;
    const valor = Number(document.getElementById("vValor").value) || 0;
    const produto = produtos.find((p) => p.id === produtoId);
    if (!produto) return;

    const qtdAtual = Number(produto.quantidade) || 0;
    const novaQtd = qtdAtual - quantidade;
    if (novaQtd < 0) {
      alert("Estoque insuficiente.");
      return;
    }

    let resVenda = {};
    try {
      const respVenda = await fetch(`${API}/vendas`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ produto_id: produtoId, vendedor, cliente, quantidade, valor_total: valor, observacao: `Cliente: ${cliente}` })
      });
      resVenda = await respVenda.json();
      await fetch(`${API}/saidas`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ produto_id: produtoId, quantidade, motivo: "Venda", observacao: `Cliente: ${cliente}` })
      });
      await fetch(`${API}/produtos/${produtoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...produto, quantidade: novaQtd })
      });
    } catch (err) {}

    const venda = {
      id: resVenda.id,
      vendedor,
      cliente,
      produtoId,
      produtoNome: produto.nome,
      quantidade,
      valor,
      data: new Date().toLocaleString("pt-BR")
    };
    const lista = getVendas();
    lista.push(venda);
    salvarVendas(lista);
    await renderVendas();
  });
}

function renderSaidas() {
  panelTitle.textContent = "Saídas";
  const vendas = getVendas();
  if (vendas.length === 0) {
    panelBody.innerHTML = '<p class="placeholder">Nenhuma saída registrada.</p>';
    return;
  }
  const linhas = vendas.map((v) => `
    <tr>
      <td>${escapeHtml(v.produtoNome)}</td>
      <td>${Number(v.quantidade)}</td>
      <td>${escapeHtml(v.cliente)}</td>
      <td>${escapeHtml(v.vendedor)}</td>
      <td>R$ ${Number(v.valor).toFixed(2)}</td>
      <td>${escapeHtml(v.data)}</td>
    </tr>`).join("");
  panelBody.innerHTML = `
    <table>
      <thead><tr><th>Produto</th><th>Qtd.</th><th>Cliente</th><th>Responsável</th><th>Valor</th><th>Data</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>`;
}

function renderUsuarios() {
  panelTitle.textContent = "Usuários";
  panelBody.innerHTML = '<p class="placeholder">Módulo de usuários ainda não implementado. Em breve!</p>';
}

function ativarSecao(secao) {
  if (secao !== "produtos") {
    formAberto = false;
    produtoEmEdicao = null;
    msgProdutos = { texto: "", tipo: "" };
  }
  secaoAtiva = secao;
  cards.forEach((card) => {
    card.classList.toggle("active", card.dataset.section === secao);
  });
  refreshButton.classList.toggle(
    "hidden",
    secao !== "produtos" && secao !== "estoque" && secao !== "saidas" && secao !== "vendas"
  );

  if (secao === "produtos") renderProdutos();
  else if (secao === "estoque") renderEstoque();
  else if (secao === "entradas") renderEntradas();
  else if (secao === "saidas") renderSaidas();
  else if (secao === "vendas") renderVendas();
  else if (secao === "relatorios") renderRelatorios();
}

cards.forEach((card) => {
  card.addEventListener("click", () => ativarSecao(card.dataset.section));
});

refreshButton.addEventListener("click", () => {
  if (secaoAtiva) ativarSecao(secaoAtiva);
});

logoutButton.addEventListener("click", () => {
  localStorage.removeItem("sdce_token");
  localStorage.removeItem("sdce_usuario");
  window.location.href = "index.html";
});