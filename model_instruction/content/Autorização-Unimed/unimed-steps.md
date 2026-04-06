description for agent: /externo/health-plans/13 - Passo a passo para a criação da autorização de exames e procedimentos para paciente externo na Unimed.

--Primeiros passos--
Link - http://srv2.unimedvc.coop.br:8082/
folder: medicore-backend\model_instruction\content\Autorização-Unimed\first-steps

image: medicore-backend\model_instruction\content\Autorização-Unimed\first-steps\step-1.jpeg
steps:
    Login com:
    Usuário: [EMAIL_ADDRESS]
    Senha: [PASSWORD]

image: medicore-backend\model_instruction\content\Autorização-Unimed\first-steps\step-2.jpeg
steps:
    Clicar em "Solicitar Execução"

image: medicore-backend\model_instruction\content\Autorização-Unimed\first-steps\step-3.jpeg
steps:
    Clicar em "Informar Manualmente"

image: medicore-backend\model_instruction\content\Autorização-Unimed\first-steps\step-4.jpeg
steps:
    Inserir número da carteirinha do paciente. 
    (Obs: incluir um "0" antes de colocar ou digitar o numero da carteirinha.)

image: medicore-backend\model_instruction\content\Autorização-Unimed\first-steps\step-5.jpeg
steps:
    Clicar em "Continuar" para prosseguir.

--Área do preenchimento da autorização--

image: medicore-backend\model_instruction\content\Autorização-Unimed\step-6_fields_13-19.jpeg
steps:
    CAMPO 13 - 00000023
    CAMPO 15 - NOME DO MEDICO
    CAMPOS 16, 17, 18 - Será auto preenchido com os dados do medico
    CAMPO 19 - 225125

image: medicore-backend\model_instruction\content\Autorização-Unimed\step-7_fields_21-91.jpeg
steps:
    CAMPO 21 - URGENCIA E EMERGENCIA
    CAMPO 23 - MOTIVO (Ex: Queda, Dor a Esclarecer)
    CAMPO 32 - Exame
    CAMPO 91 - Pronto Atendimento


image: medicore-backend\model_instruction\content\Autorização-Unimed\step-8_fields_40-55.jpeg
steps:
    CAMPO 40 - Código TUSS do Exame solicitado
    CAMPO 41 - Será auto preenchido com nome do exame
    CAMPO 42 - Quantidade do exame
    CAMPO 48 - Clicar, será aberto (Selecione os Procedimentos deste Profissional)
    CAMPO 51 - Nome do Medico
    CAMPO 50 - CPF do Medico (Geralmente auto preenchido ao completar o CAMPO 51)
    CAMPO 55 - 225125

image: medicore-backend\model_instruction\content\Autorização-Unimed\last-step.jpeg
step: Clicar em "Solicitar Autorização"

Caso autorizado, clicar em "Imprimir" guia TISS e solicitar a assinatura do paciente na guia e o carimbo do médico.