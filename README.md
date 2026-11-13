# Controle remoto web para Android TV

Controle local para TCL com Google TV ou outra Android TV. O navegador fala com a API Node.js; a API usa ADB instalado no Mac. Nenhum serviço externo é necessário.

## Requisitos no macOS

- Node.js 20 ou mais recente e npm. Instale pelo site do Node.js ou com `brew install node`.
- Android Platform Tools: `brew install android-platform-tools`. Confirme com `adb version`.
- Mac e TV na mesma rede local.

## Preparar a TV

Na TV, abra **Configurações → Sistema → Sobre** e pressione **Build** várias vezes para ativar as opções de desenvolvedor. Em **Opções do desenvolvedor**, ative **Depuração sem fio** (ou depuração ADB, conforme o modelo). Anote o IP e a porta mostrados pela TV. Autorize o Mac na tela da TV quando solicitado.

Em versões que exigem pareamento, selecione **Parear dispositivo com código** na TV. Na interface web, informe o IP, a *porta de pareamento* exibida e o código de seis dígitos; clique **Parear**. Depois use a *porta de conexão ADB* da tela principal da TV e clique **Salvar e conectar**. As duas portas podem ser diferentes. O código de pareamento não é salvo.

Também é possível testar manualmente: `adb pair IP:PORTA_PAREAMENTO`, seguido de `adb connect IP:PORTA_ADB`.

## Instalação e uso

```bash
npm install
cp backend/.env.example backend/.env
npm run dev
```

Abra `http://localhost:5173`. Em configurações, digite o IP ou nome e a porta ADB da TV. O endereço é salvo em `backend/data/config.json` com permissões restritas. O arquivo de ambiente `TV_HOST`/`TV_PORT` pode definir um valor inicial. Use os botões ou as setas, Enter, Esc e Espaço no teclado. Digite texto com foco em um campo de texto da TV.

O campo de texto aceita ASCII. O comando `adb shell input text` não oferece entrada Unicode confiável; acentos e emojis retornam um erro claro. Espaços são convertidos para `%s`. Para digitação Unicode seria necessário um método de entrada adicional na TV.

Atalhos de aplicativos usam os pacotes configuráveis `APP_YOUTUBE`, `APP_NETFLIX`, `APP_PRIME` e `APP_DISNEY` em `backend/.env`. Os padrões são conhecidos para Android TV, mas podem variar conforme a versão instalada.

## Rede local e segurança

A API e o Vite escutam apenas no loopback por padrão. Para abrir a interface na rede, configure `API_HOST=0.0.0.0`, `FRONTEND_ORIGIN=http://IP_DO_MAC:5173` e um `API_TOKEN` aleatório de pelo menos 24 caracteres no ambiente da API. Configure também o host do Vite para a rede em `frontend/vite.config.ts` e abra o frontend pelo IP do Mac. Informe o mesmo token nas configurações da interface. Não encaminhe a porta ADB nem a API para a internet. O token fica somente em `sessionStorage` no navegador.

## API

Rotas sob `/api/tv`: `GET /status`, `GET /config`, `GET /info`, `GET /apps`, `POST /connect`, `POST /disconnect`, `POST /pair`, `POST /command`, `POST /app`, `POST /text`. Erros usam `{ "error": { "code": "...", "message": "..." } }`. O status executa apenas `adb devices` e nunca reconecta sozinho. Comandos só aceitam nomes da lista em `backend/src/services/validation.ts`.

## Problemas comuns

- **ADB não encontrado:** confirme `adb version` no mesmo terminal em que inicia o projeto.
- **TV desconectada:** confirme IP, porta e rede; reative a depuração sem fio e clique em conectar. A porta pode mudar após reiniciar a TV.
- **Falha no pareamento:** use a porta de pareamento, não a porta ADB principal, e gere um código novo na TV.
- **Aplicativo não abre:** confirme que está instalado e ajuste o pacote correspondente no `.env`.
- **Texto com acentos não entra:** limite do `adb input text`; use ASCII ou um método de entrada adicional.
- **API não inicia em modo rede:** defina um `API_TOKEN` com pelo menos 24 caracteres.

## Verificação

```bash
npm test
npm run build
```

Os testes simulam ADB e não precisam de uma TV conectada. Para iniciar a versão compilada da API: `npm run start -w backend`.
