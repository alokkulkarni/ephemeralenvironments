import React from 'react';
import { useApi, configApiRef } from '@backstage/core-plugin-api';
import { environmentApiRef } from '../api';
import { Environment } from '../types';
import {
  Content,
  ContentHeader,
  Header,
  Page,
  SupportButton,
} from '@backstage/core-components';
import { EnvironmentList } from './EnvironmentList';
import { Grid } from '@material-ui/core';
import { useEntity } from '@backstage/plugin-catalog-react';

export const TerraformEnvironmentsPage = () => {
  const api = useApi(environmentApiRef);
  const configApi = useApi(configApiRef);
  const { entity } = useEntity();
  const [environments, setEnvironments] = React.useState<Environment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error>();

  // Get default values from config or use fallbacks
  const defaultOwner = configApi.getOptionalString('terraformEnvironments.defaultOwner') || 'alokkulkarni';
  const defaultRepo = configApi.getOptionalString('terraformEnvironments.defaultRepo') || 'ephemeralenvironments';

  // Use entity annotations if available, otherwise use defaults from config
  const owner = entity.metadata.annotations?.['github.com/owner'] || defaultOwner;
  const repo = entity.metadata.annotations?.['github.com/repo'] || defaultRepo;

  React.useEffect(() => {
    const fetchEnvironments = async () => {
      try {
        const data = await api.listEnvironments({ owner, repo });
        setEnvironments(data);
      } catch (e) {
        setError(e as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchEnvironments();
  }, [api, owner, repo]);

  const handleDestroy = async (id: string) => {
    try {
      await api.destroyEnvironment({ owner, repo, id });
      // Refresh the list
      const data = await api.listEnvironments({ owner, repo });
      setEnvironments(data);
    } catch (e) {
      setError(e as Error);
    }
  };

  return (
    <Page themeId="tool">
      <Header
        title="Terraform Environments"
        subtitle="Manage your ephemeral environments"
      />
      <Content>
        <ContentHeader title="Environments">
          <SupportButton>
            Manage your ephemeral environments created with Terraform.
          </SupportButton>
        </ContentHeader>
        <Grid container spacing={3} direction="column">
          <Grid item>
            <EnvironmentList
              environments={environments}
              loading={loading}
              error={error}
              onDestroy={handleDestroy}
            />
          </Grid>
        </Grid>
      </Content>
    </Page>
  );
}; 