/*
 * A regra do prefixo --rendra- mora em src/cli/var-prefix.ts (entra no pacote da CLI, para
 * `rendra auditar --all`). Este arquivo só reexporta, para o verificador, os testes e quem
 * copiou `scripts/lib` continuarem importando daqui.
 */
export * from '../../src/cli/var-prefix.ts'
