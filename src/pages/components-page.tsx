import { ChevronDown, List } from 'lucide-react'
import { Collapsible } from 'radix-ui'
import { useState } from 'react'
import { useBrand } from '@/brand'
import { Container, Grid, PageHeader, Stack } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { shapeLabels } from '@/lib/shape'
import { ActionsSection } from './showcase/actions-section'
import { CompositionSection } from './showcase/composition-section'
import { DataSection } from './showcase/data-section'
import { Demo, Row } from './showcase/demo'
import { FeedbackSection } from './showcase/feedback-section'
import { FormsSection } from './showcase/forms-section'
import { NavigationSection } from './showcase/navigation-section'
import { PlanningSection } from './showcase/planning-section'
import { allIds, SectionNav, titleOf, useScrollSpy } from './showcase/sections-nav'

/*
 * VITRINE /componentes: cada componente com variantes, tamanhos e estados,
 * e as regras de composição. Menu lateral fixo com scrollspy; recolhível no mobile.
 */

export function ComponentsPage() {
  const active = useScrollSpy(allIds)
  const { brand, palette } = useBrand()
  const [navOpen, setNavOpen] = useState(false)

  return (
    <Container padded>
      <Stack gap="section">
        <PageHeader
          title="Componentes"
          description={`Cada componente com variantes, tamanhos e estados. Modelo ${brand.productName} (formato ${shapeLabels[brand.shape].toLowerCase()}) com a paleta ${palette.name}. Troque pelo menu do avatar.`}
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
                    <SectionNav active={active} onNavigate={() => setNavOpen(false)} />
                  </CardContent>
                </Card>
              </Collapsible.Content>
            </Collapsible.Root>
            <div className="hidden max-h-sheet overflow-y-auto lg:block">
              <SectionNav active={active} />
            </div>
          </nav>

          <Stack gap="section" className="min-w-0 lg:col-span-3">
            <ActionsSection />
            <FormsSection />
            <NavigationSection />
            <DataSection />
            <PlanningSection />
            <FeedbackSection />
            <CompositionSection />

            <Demo
              id="primitivas"
              title="Primitivas de layout"
              description="Toda tela é composta por Container, Stack, Inline, Grid, Section e PageHeader. O respiro da página é igual em todos os lados: 16px no celular e 24px a partir do tablet."
              props="Container (size, padded) · Stack (gap, align) · Inline (gap, justify, wrap, stackOnMobile) · Grid (cols por faixa, responsive: screen | container) · Section · PageHeader"
            >
              <Row label="Grid 1, 2 e 4 colunas">
                <Grid cols={{ base: 1, sm: 2, lg: 4 }} className="w-full">
                  {[1, 2, 3, 4].map((n) => (
                    <div
                      key={n}
                      className="flex h-12 items-center justify-center rounded-control border border-primary bg-primary-soft text-sm font-medium text-primary-soft-foreground"
                    >
                      {n}
                    </div>
                  ))}
                </Grid>
              </Row>
              <Row label="Grid por container (reage à largura do bloco)">
                <Grid cols={{ base: 1, sm: 2, md: 3 }} responsive="container" className="w-full">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="flex h-12 items-center justify-center rounded-control border border-secondary text-sm font-medium"
                    >
                      {n}
                    </div>
                  ))}
                </Grid>
              </Row>
            </Demo>
          </Stack>
        </Grid>
      </Stack>
    </Container>
  )
}
