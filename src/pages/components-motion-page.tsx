import { ChevronDown, List } from 'lucide-react'
import { Collapsible } from 'radix-ui'
import { useState } from 'react'
import { Container, Grid, PageHeader, Stack } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Card, CardContent } from '@/components/ui/card'
import { MotionModeScope, MotionProvider, type MotionMode } from '@/lib/motion'
import { rendraMotion } from '@/lib/motion/motion-on'
import { ActionsSection } from './showcase/actions-section'
import { CompositionSection } from './showcase/composition-section'
import { DataSection } from './showcase/data-section'
import { FeedbackSection } from './showcase/feedback-section'
import { FormsSection } from './showcase/forms-section'
import { NavigationSection } from './showcase/navigation-section'
import { PlanningSection } from './showcase/planning-section'
import { allIds, SectionNav, titleOf, useScrollSpy } from './showcase/sections-nav'

/*
 * VITRINE /componentes-motion: as mesmas sete seções de /componentes, com um seletor para ligar e
 * desligar o motion e comparar o comportamento. Abre em ligado e não guarda a escolha.
 *
 * O `MotionProvider mode="on"` fica sempre montado (o LazyMotion do Motion) e o seletor só troca o
 * modo lido pelos componentes (`MotionModeScope`), sem aninhar o RendraProvider. Trocar o modo muda
 * o elemento de alguns componentes (li por m.li, por exemplo) e os remonta: o estado de uma demo
 * (modal aberto, ordem de uma lista) volta ao inicial. É esperado numa tela de comparação.
 *
 * A seção "Primitivas de layout" é um bloco solto de /componentes, não um dos componentes
 * animados, e fica fora desta página (e da navegação lateral).
 */

const modes = [
  { value: 'on', label: 'Ligado' },
  { value: 'off', label: 'Desligado' },
]

const sections = allIds.filter((id) => id !== 'primitivas')
const navGroups = (id: string) => id !== 'primitivas'

export function ComponentsMotionPage() {
  const active = useScrollSpy(sections)
  const [mode, setMode] = useState<MotionMode>('on')
  const [navOpen, setNavOpen] = useState(false)

  return (
    <Container padded>
      <Stack gap="section">
        <PageHeader
          title="Componentes com motion"
          description="As mesmas seções de Componentes, com as animações que o Motion acrescenta. Use o seletor para comparar com e sem motion."
          actions={
            <ButtonGroup
              aria-label="Motion"
              options={modes}
              value={mode}
              onChange={(v) => setMode(v as MotionMode)}
            />
          }
        />

        <Grid cols={{ base: 1, lg: 4 }} gap="8">
          <nav aria-label="Seções da vitrine" className="lg:sticky lg:top-6 lg:self-start">
            <Collapsible.Root open={navOpen} onOpenChange={setNavOpen} className="lg:hidden">
              <Collapsible.Trigger asChild>
                <Button variant="outline" fullWidth icon={<List />} iconRight={<ChevronDown />}>
                  <span className="flex-1 text-left">{titleOf[active] ?? 'Seções'}</span>
                </Button>
              </Collapsible.Trigger>
              <Collapsible.Content className="overflow-hidden pt-2 data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                <Card>
                  <CardContent className="p-2 md:p-2">
                    <SectionNav
                      active={active}
                      onNavigate={() => setNavOpen(false)}
                      include={navGroups}
                    />
                  </CardContent>
                </Card>
              </Collapsible.Content>
            </Collapsible.Root>
            <div className="hidden max-h-sheet overflow-y-auto lg:block">
              <SectionNav active={active} include={navGroups} />
            </div>
          </nav>

          <MotionProvider mode={rendraMotion}>
            <MotionModeScope mode={mode}>
              <Stack gap="section" className="min-w-0 lg:col-span-3">
                <ActionsSection />
                <FormsSection />
                <NavigationSection />
                <DataSection />
                <PlanningSection />
                <FeedbackSection />
                <CompositionSection />
              </Stack>
            </MotionModeScope>
          </MotionProvider>
        </Grid>
      </Stack>
    </Container>
  )
}
