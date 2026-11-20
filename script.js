const form = document.getElementById("authForm");
const toggleMode = document.getElementById("toggleMode");
const submitButton = document.getElementById("submitButton");
const nome = document.getElementById("nome");
const email = document.getElementById("email");
const senha = document.getElementById("senha");
const confirmarSenha = document.getElementById("confirmarSenha");
const message = document.getElementById("message");

let cadastroAtivo = false;

if (localStorage.getItem("sdce_token")) {
  window.location.href = "home.html";
}

function mostrarMensagem(texto, sucesso = false) {
  message.textContent = texto;
  message.style.color = sucesso ? "#087c26" : "#c62828";
}

toggleMode.addEventListener("click", () => {
  cadastroAtivo = !cadastroAtivo;
  nome.classList.toggle("hidden", !cadastroAtivo);
  nome.required = cadastroAtivo;
  confirmarSenha.classList.toggle("hidden", !cadastroAtivo);
  confirmarSenha.required = cadastroAtivo;
  submitButton.textContent = cadastroAtivo ? "Cadastrar" : "Entrar";
  toggleMode.textContent = cadastroAtivo ? "Voltar ao Login" : "Criar Conta";
  senha.autocomplete = cadastroAtivo ? "new-password" : "current-password";
  message.textContent = "";
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  mostrarMensagem("");

  if (cadastroAtivo && senha.value !== confirmarSenha.value) {
    mostrarMensagem("As senhas não são iguais.");
    return;
  }

  const dados = cadastroAtivo
    ? { nome: nome.value.trim(), email: email.value.trim(), senha: senha.value }
    : { email: email.value.trim(), senha: senha.value };

  try {
    const resposta = await fetch(
      `http://localhost:3000/api/auth/${cadastroAtivo ? "cadastro" : "login"}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados)
      }
    );

    const resultado = await resposta.json();

    if (!resposta.ok) {
      mostrarMensagem(resultado.mensagem || "Não foi possível concluir a operação.");
      return;
    }

    mostrarMensagem(resultado.mensagem, true);

    if (cadastroAtivo) {
      form.reset();
      cadastroAtivo = false;
      nome.classList.add("hidden");
      nome.required = false;
      confirmarSenha.classList.add("hidden");
      confirmarSenha.required = false;
      submitButton.textContent = "Entrar";
      toggleMode.textContent = "Criar Conta";
    } else {
      localStorage.setItem("sdce_token", resultado.token);
      localStorage.setItem("sdce_usuario", JSON.stringify(resultado.usuario));
      window.location.href = "home.html";
    }
  } catch (error) {
    mostrarMensagem("Não foi possível conectar ao servidor. Confira se o back-end está ligado.");
  }
});
