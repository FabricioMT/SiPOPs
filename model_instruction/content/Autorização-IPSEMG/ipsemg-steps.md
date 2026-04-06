description for agent: /externo/health-plans/13 - Passo a passo para a criação da autorização de exames e procedimentos para paciente externo na Unimed.

--Primeiros passos--
Link - http://safe.ipsemg.mg.gov.br/safe/
folder: medicore-backend\model_instruction\content\Autorização-IPSEMG\image-steps

image: medicore-backend\model_instruction\content\Autorização-IPSEMG\image-steps\step-1.jpeg
steps:
    Login com:
    Usuário: [EMAIL_ADDRESS]
    Senha: [PASSWORD]

image: medicore-backend\model_instruction\content\Autorização-IPSEMG\image-steps\step-2.jpeg
steps:
    Clicar em "Execução de Procedimento"

image: medicore-backend\model_instruction\content\Autorização-IPSEMG\image-steps\step-3.jpeg
steps:
    Pagina completa com os campos vazios.
    folder: medicore-backend\model_instruction\content\Autorização-IPSEMG\sub-steps-3
    image: medicore-backend\model_instruction\content\Autorização-IPSEMG\sub-steps\step-3-1.jpeg
    steps: Execução de Procedimento
        Clicar em "Urgencia/Emergencia"

    image: medicore-backend\model_instruction\content\Autorização-IPSEMG\sub-steps\step-3-2.jpeg
    steps: Beneficiario
        Inserir o número do cartão do beneficiário
        Inserir via do Cartão: 01. (Padrão)
        (Obs. Caso 01 falhe, tentar 02)
        
    image: medicore-backend\model_instruction\content\Autorização-IPSEMG\sub-steps\step-3-3.jpeg
    steps: Proficional Executante/Solicitante
        Inserir o CRM do médico solicitante
        Tipo do Concelho: CRM

    image: medicore-backend\model_instruction\content\Autorização-IPSEMG\sub-steps\step-3-4.jpeg
    steps: Procedimentos
        Inserir o código do procedimento
        (Obs. Consultar Tabela TUSS)
    image: medicore-backend\model_instruction\content\Autorização-IPSEMG\sub-steps\step-3-5.jpeg
    steps: Confirmar Execução
        Clicar em "Executar"
        Abrirá uma aba com o pdf da autorização.
        Imprimir o pdf e solicitar a assinatura do beneficiário, caso acompanhante solicitar assinatura do acompanhante por extenso CPF e parentesco.
        
image: medicore-backend\model_instruction\content\Autorização-IPSEMG\image-steps\step-4.jpeg
steps: Pagina preenchida de exemplo.

