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

// Define annotation keys as constants
const ANNOTATION_PROJECT_NAME = 'terraform-environments/project-name';
const ANNOTATION_ORG_NAME = 'terraform-environments/org-name';
const ANNOTATION_SQUAD_NAME = 'terraform-environments/squad-name';
const ANNOTATION_GITHUB_OWNER = 'terraform-environments/github-owner';
const ANNOTATION_GITHUB_REPO = 'terraform-environments/github-repo';

export const TerraformEnvironmentsPage = () => {
  const api = useApi(environmentApiRef);
  const configApi = useApi(configApiRef);
  const { entity } = useEntity();
  const [environments, setEnvironments] = React.useState<Environment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error>();

  // Get project metadata from entity annotations
  const projectName = entity.metadata.annotations?.[ANNOTATION_PROJECT_NAME];
  const orgName = entity.metadata.annotations?.[ANNOTATION_ORG_NAME];
  const squadName = entity.metadata.annotations?.[ANNOTATION_SQUAD_NAME];
  
  // Get GitHub repository info from annotations or config
  const defaultOwner = configApi.getOptionalString('terraformEnvironments.defaultOwner') || 'alokkulkarni';
  const defaultRepo = configApi.getOptionalString('terraformEnvironments.defaultRepo') || 'ephemeralenvironments';
  const owner = entity.metadata.annotations?.[ANNOTATION_GITHUB_OWNER] || defaultOwner;
  const repo = entity.metadata.annotations?.[ANNOTATION_GITHUB_REPO] || defaultRepo;

  // Validate required annotations
  React.useEffect(() => {
    if (!projectName || !orgName || !squadName) {
      setError(new Error(
        `Missing required annotations: ${ANNOTATION_PROJECT_NAME}, ${ANNOTATION_ORG_NAME}, or ${ANNOTATION_SQUAD_NAME}`
      ));
      setLoading(false);
      return;
    }
  }, [projectName, orgName, squadName]);

  React.useEffect(() => {
    const fetchEnvironments = async () => {
      if (!projectName || !orgName || !squadName) return;
      
      try {
        const data = await api.listEnvironments({ 
          owner, 
          repo,
          projectName: projectName,
          orgName: orgName,
          squadName: squadName
        });
        setEnvironments(data);
      } catch (e) {
        setError(e as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchEnvironments();
  }, [api, owner, repo, projectName, orgName, squadName]);

  const handleDestroy = async (id: string) => {
    if (!projectName || !orgName || !squadName) {
      setError(new Error('Missing required annotations'));
      return;
    }

    try {
      await api.destroyEnvironment({ 
        owner, 
        repo, 
        id,
        projectName: projectName,
        orgName: orgName,
        squadName: squadName
      });
      // Refresh the list
      const data = await api.listEnvironments({ 
        owner, 
        repo,
        projectName: projectName,
        orgName: orgName,
        squadName: squadName
      });
      setEnvironments(data);
    } catch (e) {
      setError(e as Error);
    }
  };

  if (!projectName || !orgName || !squadName) {
    return (
      <Page themeId="tool">
        <Header
          title="Terraform Environments"
          subtitle="Manage your ephemeral environments"
        />
        <Content>
          <ContentHeader title="Error">
            <SupportButton>
              Missing required annotations. Please add the required annotations to your component.
            </SupportButton>
          </ContentHeader>
        </Content>
      </Page>
    );
  }

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