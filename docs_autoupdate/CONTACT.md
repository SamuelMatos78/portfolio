# Contato por email

O formulário aparece em `#tp=contact` e usa somente **FormSubmit**, com destino em **samuelomatos@hotmail.com**. `src/data/contact.json` centraliza destino, título fixo e confirmação em PT/EN. Não há chave, senha, SMTP ou conta de serviço no código. O endereço Gmail não foi conectado.

## Ativar em produção

1. Publique o site normalmente na Vercel, sem variáveis de ambiente novas.
2. Abra Contato, preencha com seu próprio email e uma mensagem de teste e envie. Conclua o CAPTCHA no FormSubmit.
3. No Hotmail, abra o email do FormSubmit e confirme a ativação. Confira também o spam.
4. Faça um novo envio e confira o recebimento no Hotmail e a confirmação automática no endereço do remetente. **A integração só está verificada de ponta a ponta após essa ativação e esse teste real.**

O serviço exige ativação da caixa destinatária. A implementação local não consegue confirmar essa caixa pelo autor. Não mostre um aviso de entrega concluída antes da resposta do serviço. O formulário navega para a página de verificação/resultado do FormSubmit; não simula sucesso no site.

## Fluxo e limites

- O envio é um **POST nativo** diretamente ao backend do FormSubmit. Isso é intencional: o serviço não oferece autoresposta em envios AJAX ou com CAPTCHA desativado.
- CAPTCHA ligado e honeypot `_honey`. Nunca remova o CAPTCHA para evitar a etapa externa.
- O visitante informa um único email, assunto de 3–120 caracteres e mensagem opcional de até 3.000 caracteres. Não há anexos.
- O título real do email (`_subject`) é fixo. O assunto do visitante fica em `Assunto`, no **corpo**, nunca interpolado em cabeçalhos, HTML ou URLs pelo site.
- `validation.ts` rejeita controles/quebras de linha/HTML no assunto, endereços múltiplos e tamanhos excessivos. Esses controles no navegador melhoram a experiência; podem ser contornados e **não substituem as proteções do backend do provedor**. Não prometa que qualquer email recebido é inofensivo. Filtragem, processamento dos campos, CAPTCHA e entrega ficam com o FormSubmit.
- A confirmação automática é fixa e localizada. O email do visitante permite responder à conversa. Não use texto arbitrário do usuário como `_autoresponse`, `_replyto`, `_subject`, `_cc`, redirecionamento ou destinatário.
- Nenhum rascunho é salvo no localStorage, nenhuma mensagem é coletada por GitHub Stats. Os campos vão ao provedor apenas quando o visitante envia o formulário.

Não adicione um segundo serviço nem dependências para esse fluxo. A entrega final depende do provedor e do filtro de spam da caixa; o site não pode garantir chegada à caixa de entrada.

Referência: [FormSubmit — documentação oficial](https://formsubmit.co/documentation), especialmente `_subject`, `_honey` e `_autoresponse`.
