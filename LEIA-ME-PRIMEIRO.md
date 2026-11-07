# CorteCabelo — versão multibarbearias (primeira etapa)

Esta versão parte dos arquivos originais e preserva a aparência preta e dourada. Ela cria uma estrutura para que muitos salões possam usar **o mesmo site**, cada um com seu próprio link, barbeiros e agendas.

## O que já funciona

- **admin.html**: seu painel, para cadastrar salões, cadastrar profissionais dentro de um salão e bloquear/desbloquear salões.
- **index.html?b=barbearia-a**: página para clientes do salão A. Os barbeiros de outros salões não aparecem.
- **login.html?b=barbearia-a**: login dos profissionais do salão A.
- **barbeiros.html?b=barbearia-a**: agenda individual do barbeiro que fez login.
- Dois barbeiros com o mesmo nome podem trabalhar em salões diferentes sem misturar agendamentos.
- Os horários permanecem de 9h às 17h30, como no projeto original, com intervalos de 30 minutos.
- O agendamento usa uma transação e ID exclusivo por profissional/dia/horário para evitar reservas duplicadas feitas simultaneamente pelo sistema.
- O painel permite bloquear a barbearia. Quando bloqueada, não aceita novas reservas e não abre o login/agenda no fluxo normal.
- As senhas existentes não foram alteradas nesta etapa, conforme solicitado.

## Como testar no computador

1. **Guarde uma cópia do projeto original.** Extraia esta pasta para outro lugar; não apague o original.
2. Execute um servidor HTTP na pasta deste projeto. Se tiver Python instalado, abra o terminal na pasta e execute:

   ```bash
   python -m http.server 8000
   ```

   Abra `http://localhost:8000/admin.html` no navegador. Se preferir, pode publicar os arquivos em uma hospedagem de site estático e usar o respectivo endereço.
3. Entre no painel administrativo com a senha antiga.
4. Cadastre **Barbearia A** e **Barbearia B**. O sistema sugere automaticamente os identificadores `barbearia-a` e `barbearia-b`.
5. Clique em **Gerenciar barbeiros** em cada salão. Cadastre dois profissionais no salão A e outros dois no salão B. Até podem ter o mesmo nome, desde que tenham seus cadastros separados.
6. No painel, clique em **Copiar link** para abrir ou compartilhar o endereço próprio de cada salão.
7. Faça um agendamento pelo link A; entre no login do profissional A e confira a agenda na data escolhida. Verifique também se o agendamento não apareceu no salão B.
8. Teste o botão de bloqueio do salão A; o agendamento pelo seu link deverá ficar indisponível. Desbloqueie para continuar os testes.

**Exemplos de URLs quando executado localmente:**

- `http://localhost:8000/index.html?b=barbearia-a`
- `http://localhost:8000/index.html?b=barbearia-b`
- `http://localhost:8000/login.html?b=barbearia-a`

A hospedagem real produzirá seus próprios links. O endereço é gerado automaticamente no painel.

## Já tinha dados no Firebase antigo?

Os cadastros antigos estavam nas coleções gerais `barbeiros` e `agendamentos`. A nova estrutura utiliza:

```text
saloes/
  barbearia-a/
    (nome, ativo)
    barbeiros/
      <id-do-profissional> (nome, login, senha, ativo)
    agendamentos/
      <id-profissional>_<data>_<hora> (cliente, whatsapp, servico, status...)
  barbearia-b/
    ...
```

Os dados **não são migrados automaticamente**. Para aproveitar os antigos, crie primeiro um salão novo e vazio, clique em **Gerenciar barbeiros**, abra **Já tenho barbeiros e agendamentos no sistema antigo** e escolha **Importar os dados antigos para este salão**.

A importação **copia**, sem apagar nada das coleções anteriores. Ela só começa se as coleções do novo salão estiverem vazias. Se existirem dois barbeiros antigos com o mesmo nome, a importação será recusada para evitar associar horários ao profissional errado. Se houver agendamentos antigos incompatíveis ou duplicados, o sistema mostra a quantidade ignorada. **Faça backup do Firestore antes de importar dados reais** e confira os registros depois da operação. Em caso de erro durante lotes grandes, pode ocorrer uma importação parcial; não repita às cegas.

## Firebase e segurança — importante

- Foi **mantida a configuração do projeto Firebase já presente no script.js**. Testar com esta configuração pode escrever dados no Firebase que você já utiliza. Não foi alterado remotamente nenhum dado por esta entrega.
- Sua configuração atual de regras do Firestore pode precisar de adaptação para permitir o acesso às novas coleções `saloes/{id}/barbeiros` e `saloes/{id}/agendamentos`. Não foram fornecidas as regras do projeto original, portanto elas **não foram alteradas nem supostas**.
- A senha simples do admin e as senhas dos barbeiros continuam no modelo anterior, a seu pedido. **O filtro por link limita o que a interface mostra, mas não cria uma barreira de segurança no Firebase**. Sem autenticação e regras de acesso adequadas, pessoas poderiam acessar ou alterar dados fora da interface. Não use dados reais de clientes ou comercialize antes dessa proteção estar implementada e testada.
- Não publique regras do Firestore que liberem leitura e escrita de todos os dados para qualquer pessoa. Precisamos discutir acesso seguro antes de lançamento comercial.

## Próximas melhorias (ainda não implementadas)

- Logo e identidade visual diferentes por barbearia.
- Serviços, preços e horários de funcionamento configuráveis por salão ou profissional.
- Cobrança e renovação de assinatura de R$ 100/mês. O bloqueio/desbloqueio manual já existe; o pagamento automático ainda não.
- Proteção robusta dos dados, revisão dos logins e regras do Firebase.
- PWA/ícone instalável no celular, mantendo o link individual de cada barbearia.

## Testes realizados nesta entrega

Foram conferidos o JavaScript e os arquivos HTML. Também foi executado um teste de interface móvel com **Firebase simulado**, cobrindo cadastro de dois salões, dois barbeiros de mesmo nome, agendamento e marcação do horário ocupado, ausência de mistura entre salões, login, visualização da agenda e tratamento de link sem salão. **Não foi feito teste com acesso real ao seu Firebase**.
