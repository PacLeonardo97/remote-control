# Controle remoto web para Android TV

Controle local para TCL com Google TV ou outra Android TV. O navegador em qualquer aparelho da rede abre a interface hospedada no Raspberry Pi. O backend oferece **Remote Protocol v2** (sem depuração ADB) e **ADB** como métodos independentes. Nenhum serviço externo é necessário.

## Instalar no Raspberry Pi

Use Raspberry Pi OS ou outra distribuição Linux para ARM, com Node.js **22 ou mais recente** e npm. A biblioteca Remote Protocol escolhida exige Node.js 22+. ADB só é necessário para o método ADB. No Raspberry Pi OS, instale ADB com:

```bash
sudo apt update
sudo apt install android-tools-adb
adb version
node --version
```

Se o Node instalado pela distribuição for anterior à versão 22, instale uma versão atual do Node.js para ARM antes de continuar. Copie esta pasta para o Raspberry (por Git, `scp` ou outro meio) e, nela, execute:

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

Descubra o IP do Raspberry com `hostname -I`. Em um celular ou computador **na mesma rede**, abra `http://IP_DO_RASPBERRY:3001`. A interface pedirá o token; informe o valor de `API_TOKEN`. Escolha **Remote Protocol** ou **ADB** na tela inicial. A escolha mais recente fica salva no navegador, e o botão **Trocar** volta à seleção. Selecionar um método não inicia uma conexão. A interface e a API usam a mesma porta, então não é necessário expor o Vite ou configurar CORS para cada aparelho.

## Remote Protocol v2

Escolha **Usar Remote Protocol**, abra as configurações e informe o IP da TV. O botão de busca tenta encontrar TVs por mDNS (`_androidtvremote2._tcp`); se a rede bloquear multicast, digite o IP manualmente. Clique **Conectar**. Quando o status mostrar **Aguardando PIN**, digite o código exibido na TV no campo de pareamento. O backend acessa a TV diretamente pelas portas TCP **6467** (pareamento) e **6466** (controle). Não é preciso ativar a depuração ADB.

O certificado e a chave gerados pela biblioteca ficam apenas em `backend/data/` no Raspberry, com permissões `0600`; o diretório recebe `0700`. O navegador não recebe essas credenciais. Após reiniciar o serviço, clique **Conectar** para reutilizar o certificado; não há conexão automática na abertura do site. **Remover pareamento salvo** desconecta e apaga a credencial local. Se a TV revogar a autorização, remova o pareamento e repita o fluxo.

Os botões de navegação, volume, multimídia, Power e Configurações usam códigos de tecla do protocolo. O texto é enviado pela função de entrada IME da biblioteca, quando o campo da TV aceitar texto. A interface mostra aplicativo aberto, energia e volume conforme os eventos enviados pela TV; até chegar o primeiro evento, exibe **Sem informação**. A atualização chega à interface por um fluxo de eventos da API. O touchpad traduz deslizes em setas e toque em OK; não controla um cursor livre. Segurar um botão por cerca de 450 ms inicia uma pressão longa, encerrada ao soltar (com limite de segurança no backend).

Os atalhos YouTube, Netflix, Prime Video e Disney+ usam deep links enviados diretamente pelo Remote Protocol. Os links padrão seguem o [exemplo do projeto androidtvremote2](https://github.com/tronikos/androidtvremote2/blob/main/src/demo.py) e podem ser ajustados por `REMOTE_APP_YOUTUBE`, `REMOTE_APP_NETFLIX`, `REMOTE_APP_PRIME` e `REMOTE_APP_DISNEY` em `backend/.env`. O protocolo envia a solicitação, mas não confirma que o aplicativo abriu; o resultado varia conforme a versão instalada na TV. O estado é consultado sem iniciar conexão; a biblioteca tenta reconectar quando perde a sessão.

Integração: [`@kud/androidtv-remote`](https://github.com/kud/androidtv-remote), versão 0.1.2, uma implementação TypeScript do protocolo v2 com pareamento por PIN, certificado reutilizável, comandos de tecla e texto. A API da biblioteca e os testes com mocks foram verificados neste projeto. O comportamento na sua TCL ainda precisa ser testado fisicamente.

## ADB

Escolha **Usar ADB**, informe IP e porta ADB da TV em configurações e clique **Conectar**. Todos os controles e atalhos de aplicativos existentes continuam disponíveis. O pareamento ADB sem fio permanece separado do pareamento Remote Protocol.

Para iniciar automaticamente após o login do usuário, execute `bash scripts/install-raspberry-service.sh` após o build. Para manter o serviço ativo mesmo antes do login, execute o comando `sudo loginctl enable-linger SEU_USUARIO` mostrado pelo script. Consulte os logs com `journalctl --user -u tv-remote -f`. Após atualizar o projeto, execute `npm ci && npm run build && systemctl --user restart tv-remote`.

## Preparar e parear a TV

Para usar **ADB**, na TV, abra **Configurações → Sistema → Sobre** e pressione **Build** várias vezes para ativar as opções de desenvolvedor. Ative **Depuração sem fio** e anote IP e porta. O Raspberry e a TV precisam estar na mesma rede. Autorize o Raspberry na tela da TV quando solicitado.

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
- **TV desconectada no Remote Protocol:** confira se TV e Raspberry estão na mesma rede e se as portas TCP 6466/6467 estão acessíveis. Clique **Conectar** novamente; se o certificado foi revogado, remova o pareamento.
- **TV desconectada no ADB:** confira IP, porta e depuração sem fio. A porta pode mudar depois de reiniciar a TV. A consulta periódica de status não tenta reconectar; clique **Conectar**.
- **Pareamento falha:** use a porta de pareamento indicada pela TV e um código novo.
- **Aplicativo não abre:** confirme a instalação e ajuste o pacote no `.env`.

## API e testes

Rotas comuns sob `/api/control/:method` (`adb` ou `remote`): `GET /status`; `POST /connect`, `/disconnect`, `/command`, `/text`. As rotas ADB antigas em `/api/tv` continuam disponíveis, inclusive `/pair`, `/app` e `/info`. As rotas específicas do Remote Protocol em `/api/remote` incluem `GET /discover`, `/events`; `POST /pin`, `/app`, `/hold`; `DELETE /pairing`. Erros usam `{ "error": { "code": "...", "message": "..." } }`. Testes simulam ADB e Remote Protocol e não precisam da TV:

```bash
npm test
npm run build
```
