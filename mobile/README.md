# FITGO Mobile

Aplicativo Android nativo do FITGO, desenvolvido com Expo SDK 58, React Native e TypeScript. O site Vite existente permanece na raiz do repositório e não é alterado por esta aplicação.

## Primeira versão

- Painel inicial com resumo de atividades.
- Plano demonstrativo de exercícios e marcação de conclusão.
- Registro de corrida, caminhada e ciclismo com GPS.
- Captura de rota em segundo plano quando o usuário concede a permissão.
- Distância, tempo, ritmo e velocidade estimados.
- Histórico local de atividades.
- Cartão de evolução em PNG para compartilhar.
- Registro de água e lembretes locais.

## Executar

Requer Node.js 22.13 ou superior para a linha atual do Expo SDK.

```bash
cd mobile
npm install
npx expo install --fix
npx expo start
```

Para testar GPS em segundo plano, notificações e módulos nativos, use um development build ou APK. O Expo Go não substitui um build nativo para validar todos esses recursos.

## Gerar APK de teste

1. Instale a CLI: `npm install -g eas-cli`.
2. Entre na sua conta Expo: `eas login`.
3. Inicialize o projeto EAS: `eas build:configure` e associe o projeto à sua conta.
4. Gere o APK: `eas build --platform android --profile preview`.

O perfil `preview` foi configurado para gerar APK instalável. O perfil `production` gera AAB para publicação na Play Store.

## GPS e privacidade

- O FITGO só solicita localização quando a pessoa inicia uma atividade.
- A permissão em segundo plano é opcional e explicada antes de ser solicitada.
- O rastreamento em segundo plano usa um serviço de localização visível do Android.
- As atividades desta primeira versão são armazenadas localmente no aparelho.
- O cartão de compartilhamento não inclui coordenadas nem mapa por padrão.
- Antes de publicar, revisar a política de privacidade, a declaração de uso de localização no Google Play e as políticas do provedor de mapas.

## Próximas etapas de produto

1. Configurar autenticação e sincronização de dados com Supabase.
2. Criar perfil, peso, medidas, metas e gráficos históricos.
3. Evoluir planos de treino e diário alimentar.
4. Melhorar o mapa, filtros de GPS, pausa/retomada e recuperação de sessão.
5. Implementar testes em aparelhos reais, otimização de bateria e revisão de permissões.
6. Preparar página de privacidade, termos e publicação na Play Store.

## Mapas

A tela de atividade usa tiles do OpenStreetMap com atribuição visível. Antes de escalar para produção, revisar a política de uso dos tiles e selecionar um provedor de mapas adequado ao volume e às condições comerciais do aplicativo.
