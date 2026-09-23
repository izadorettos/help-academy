import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/auth/guards'
import { adminGetGamificationSettings, adminGetLevels } from '@/features/admin/settings/queries'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, Tab, TabPanel } from '@/components/ui/tabs'
import { XpSettingsForm } from './xp-settings-form'
import { LevelsTable } from './levels-table'

export const metadata: Metadata = { title: 'Configurações — Admin — Help Academy' }

export default async function AdminConfiguracoesPage() {
  await requireAdmin()

  const [settings, levels] = await Promise.all([
    adminGetGamificationSettings(),
    adminGetLevels(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 font-bold">Configurações</h1>
        <p className="text-text-muted mt-1 text-sm">
          Configure os parâmetros de gamificação da plataforma.
        </p>
      </div>

      <Tabs defaultValue="xp">
        <TabsList>
          <Tab value="xp">Configurações de XP</Tab>
          <Tab value="levels">Níveis</Tab>
        </TabsList>

        <TabPanel value="xp">
          <Card className="mt-6 p-6">
            <h2 className="mb-1 text-base font-semibold">Configurações de XP</h2>
            <p className="text-text-muted mb-6 text-sm">
              Defina a quantidade de XP concedida em cada tipo de ação. Esses valores são usados
              como padrão quando a aula ou quiz não têm XP personalizado.
            </p>
            <XpSettingsForm settings={settings} />
          </Card>
        </TabPanel>

        <TabPanel value="levels">
          <Card className="mt-6">
            <div className="border-border border-b px-6 py-4">
              <h2 className="text-base font-semibold">Níveis</h2>
              <p className="text-text-muted mt-1 text-sm">
                Configure os nomes e os limites de XP de cada nível. O teto de cada nível é o XP
                mínimo do próximo.
              </p>
            </div>
            <LevelsTable levels={levels} />
          </Card>
        </TabPanel>
      </Tabs>
    </div>
  )
}
