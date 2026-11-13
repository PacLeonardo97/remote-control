# Controle remoto web para Android TV

Controle local para TCL com Google TV ou outra Android TV. O navegador em qualquer aparelho da rede abre a interface hospedada no Raspberry Pi; o Raspberry executa ADB e envia comandos à TV. Nenhum serviço externo é necessário.

## Instalar no Raspberry Pi

Use Raspberry Pi OS ou outra distribuição Linux para ARM, com Node.js **20 ou mais recente**, npm e `adb` no `PATH`. No Raspberry Pi OS, instale ADB com:

```bash
sudo apt update
sudo apt install android-tools-adb
adb version
node --version
```

Se o Node instalado pela distribuição for anterior à versão 20, instale uma versão atual do Node.js para ARM antes de continuar. Copie esta pasta para o Raspberry (por Git, `scp` ou outro meio) e, nela, execute:

```bash
npm ci
cp backend/.env.raspberry.example backend/.env
openssl rand -hex 32
```

Edite `backend/.env` e cole o valor gerado em `API_TOKEN=`. O exemplo já habilita `API_HOST=0.0.0.0` para aceitar conexões da rede local. Em seguida:

```bash
npm run build
npm test
npm start
```

Descubra o IP do Raspberry com `hostname -I`. Em um celular ou computador **na mesma rede**, abra `http://IP_DO_RASPBERRY:3001`. A interface pedirá o token; informe o valor de `API_TOKEN`. Em configurações, digite o IP e a porta ADB da TV e clique em **Salvar e conectar**. A interface e a API usam a mesma porta, então não é necessário expor o Vite ou configurar CORS para cada aparelho.

Para iniciar automaticamente após o login do usuário, execute `bash scripts/install-raspberry-service.sh` após o build. Para manter o serviço ativo mesmo antes do login, execute o comando `sudo loginctl enable-linger SEU_USUARIO` mostrado pelo script. Consulte os logs com `journalctl --user -u tv-remote -f`. Após atualizar o projeto, execute `npm ci && npm run build && systemctl --user restart tv-remote`.

## Preparar e parear a TV

Na TV, abra **Configurações → Sistema → Sobre** e pressione **Build** várias vezes para ativar as opções de desenvolvedor. Ative **Depuração sem fio** e anote IP e porta. O Raspberry e a TV precisam estar na mesma rede. Autorize o Raspberry na tela da TV quando solicitado.

Se a TV pedir pareamento, selecione **Parear dispositivo com código**. Na interface, informe a *porta de pareamento* e o código de seis dígitos; clique **Parear**. Depois use a *porta de conexão ADB* na configuração da TV e clique **Salvar e conectar**. As portas podem ser diferentes. O código não é salvo. Também é possível usar `adb pair IP:PORTA_PAREAMENTO` e `adb connect IP:PORTA_ADB` no Raspberry, sob o mesmo usuário que executará o serviço.

O endereço da TV é salvo em `backend/data/config.json` no Raspberry. `TV_HOST` e `TV_PORT` no `.env` definem valores iniciais. O campo de texto aceita ASCII; acentos e emojis não são suportados pelo `adb shell input text`. Os pacotes dos atalhos de aplicativos podem ser alterados pelas variáveis `APP_YOUTUBE`, `APP_NETFLIX`, `APP_PRIME` e `APP_DISNEY`.

## Desenvolvimento local

```bash
npm ci
cp backend/.env.example backend/.env
npm run dev
```

Abra `http://localhost:5173`. O Vite envia `/api` ao backend na porta 3001. Para testar o frontend de desenvolvimento em outros aparelhos, configure `DEV_HOST=0.0.0.0`, `API_HOST=0.0.0.0`, `API_TOKEN` e `FRONTEND_ORIGIN=http://IP_DO_RASPBERRY:5173`. Para uso normal no Raspberry, prefira `npm run build && npm start` e a porta 3001.

## Segurança

Em modo de rede, a API exige um token de pelo menos 24 caracteres. Ele é enviado nos pedidos à API e guardado apenas no `sessionStorage` de cada navegador, até a aba ou sessão ser fechada. Como o acesso descrito usa HTTP local, use apenas uma rede doméstica confiável; para redes não confiáveis, coloque HTTPS na frente do serviço. Não encaminhe a porta 3001 nem a porta ADB para a internet. O ADB é executado somente no Raspberry e não recebe comandos arbitrários do navegador.

## Problemas comuns

- **Página não abre:** confira o IP do Raspberry, se o serviço está ativo e se a porta 3001 é permitida no firewall local. Verifique se celular e Raspberry estão na mesma rede e sem isolamento de clientes Wi-Fi.
- **Token inválido:** use o valor exato de `API_TOKEN` em `backend/.env`, salve e reinicie o serviço após alterá-lo.
- **ADB não encontrado:** confirme `adb version` no Raspberry e no usuário do serviço.
- **TV desconectada:** confira IP, porta e depuração sem fio. A porta pode mudar depois de reiniciar a TV. A consulta periódica de status não tenta reconectar; clique **Conectar**.
- **Pareamento falha:** use a porta de pareamento indicada pela TV e um código novo.
- **Aplicativo não abre:** confirme a instalação e ajuste o pacote no `.env`.

## API e testes

Rotas sob `/api/tv`: `GET /status`, `/config`, `/info`, `/apps`; `POST /connect`, `/disconnect`, `/pair`, `/command`, `/app`, `/text`. Erros usam `{ "error": { "code": "...", "message": "..." } }`. Testes simulam ADB e não precisam da TV:

```bash
npm test
npm run build
```
