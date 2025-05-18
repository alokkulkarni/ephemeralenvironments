import React from 'react';
import { useApi, configApiRef, errorApiRef } from '@backstage/core-plugin-api';
import { environmentApiRef } from '../api';
import { Environment } from '../types';
import {
  Content,
  ContentHeader,
  Header,
  Page,
  SupportButton,
  EmptyState,
  InfoCard,
  Progress,
  ErrorPanel,
} from '@backstage/core-components';
import { EnvironmentList } from './EnvironmentList';
import { Grid, Button, Typography, makeStyles } from '@material-ui/core';
import { useEntity } from '@backstage/plugin-catalog-react';
import RefreshIcon from '@material-ui/icons/Refresh';

// Define annotation keys as constants
const ANNOTATION_PROJECT_NAME = 'terraform-environments/project-name';
const ANNOTATION_ORG_NAME = 'terraform-environments/org-name';
const ANNOTATION_SQUAD_NAME = 'terraform-environments/squad-name';
const ANNOTATION_GITHUB_OWNER = 'terraform-environments/github-owner';
const ANNOTATION_GITHUB_REPO = 'terraform-environments/github-repo';

const useStyles = makeStyles(theme => ({
  refreshButton: {
    marginLeft: theme.spacing(2),
  },
  infoCard: {
    marginBottom: theme.spacing(3),
  },
}));

export const TerraformEnvironmentsPage = () => {
  const classes = useStyles();
  const api = useApi(environmentApiRef);
  const configApi = useApi(configApiRef);
  const errorApi = useApi(errorApiRef);
  const { entity } = useEntity();
  const [environments, setEnvironments] = React.useState<Environment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | undefined>(undefined);
  const [refreshKey, setRefreshKey] = React.useState(0);

  // Get project metadata from entity annotations
  const projectName = entity.metadata.annotations?.[ANNOTATION_PROJECT_NAME];
  const orgName = entity.metadata.annotations?.[ANNOTATION_ORG_NAME];
  const squadName = entity.metadata.annotations?.[ANNOTATION_SQUAD_NAME];
  
  // Get GitHub repository info from annotations or config
  const defaultOwner = configApi.getOptionalString('terraformEnvironments.defaultOwner') || '';
  const defaultRepo = configApi.getOptionalString('terraformEnvironments.defaultRepo') || '';
  const owner = entity.metadata.annotations?.[ANNOTATION_GITHUB_OWNER] || defaultOwner;
  const repo = entity.metadata.annotations?.[ANNOTATION_GITHUB_REPO] || defaultRepo;

  const missingConfig = (): string[] => {
    const missing = [];
    if (!projectName) missing.push(ANNOTATION_PROJECT_NAME);
    if (!orgName) missing.push(ANNOTATION_ORG_NAME);
    if (!squadName) missing.push(ANNOTATION_SQUAD_NAME);
    
    // Only add GitHub owner/repo to missing list if both annotation and config are missing
    if (!entity.metadata.annotations?.[ANNOTATION_GITHUB_OWNER] && !defaultOwner) {
      missing.push(`${ANNOTATION_GITHUB_OWNER} or terraformEnvironments.defaultOwner`);
    }
    if (!entity.metadata.annotations?.[ANNOTATION_GITHUB_REPO] && !defaultRepo) {
      missing.push(`${ANNOTATION_GITHUB_REPO} or terraformEnvironments.defaultRepo`);
    }
    
    return missing;
  };

  const hasRequiredConfig = missingConfig().length === 0;

  // Fetch environments when component mounts or refreshKey changes
  React.useEffect(() => {
    const fetchEnvironments = async () => {
      if (!hasRequiredConfig) {
        setLoading(false);
        return;
      }
      
      // Additional validation to ensure owner and repo are not empty strings
      if (!owner || !repo) {
        console.error('Cannot fetch environments: GitHub owner or repo is empty');
        setError(new Error('GitHub owner or repo is not configured properly'));
        setLoading(false);
        return;
      }
      
      try {
        console.log(`Fetching environments for ${projectName}/${orgName}/${squadName} from ${owner}/${repo}`);
        setLoading(true);
        const data = await api.listEnvironments({ 
          owner, 
          repo,
          projectName: projectName!,
          orgName: orgName!,
          squadName: squadName!
        });
        console.log(`Found ${data.length} environments`, data);
        setEnvironments(data);
        setError(undefined);
      } catch (e) {
        const error = e as Error;
        console.error('Error fetching environments:', error);
        setError(error);
        errorApi.post(error);
      } finally {
        setLoading(false);
      }
    };

    fetchEnvironments();
  }, [api, owner, repo, projectName, orgName, squadName, hasRequiredConfig, refreshKey, errorApi]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleDestroy = async (id: string) => {
    if (!hasRequiredConfig) return;

    // Additional validation to ensure owner and repo are not empty strings
    if (!owner || !repo) {
      const error = new Error('GitHub owner or repo is not configured properly');
      console.error('Cannot destroy environment:', error);
      setError(error);
      errorApi.post(error);
      return;
    }

    try {
      setLoading(true);
      await api.destroyEnvironment({ 
        owner, 
        repo, 
        id,
        projectName: projectName!,
        orgName: orgName!,
        squadName: squadName!
      });
      // Refresh the list
      handleRefresh();
    } catch (e) {
      const error = e as Error;
      console.error('Error destroying environment:', error);
      setError(error);
      errorApi.post(error);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (!hasRequiredConfig) {
      const missing = missingConfig();
      return (
        <EmptyState
          title="Missing configuration"
          description={
            <>
              <Typography variant="body1">
                The following annotations or configuration are missing:
              </Typography>
              <ul>
                {missing.map(item => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <Typography variant="body1">
                Please add the required annotations to your component's catalog-info.yaml file
                or configure defaults in app-config.yaml.
              </Typography>
            </>
          }
          missing="info"
        />
      );
    }

    if (loading && environments.length === 0) {
      return <Progress />;
    }

    if (error) {
      return <ErrorPanel error={error} />;
    }

    return (
      <EnvironmentList
        environments={environments}
        loading={loading}
        error={error}
        onDestroy={handleDestroy}
      />
    );
  };

  return (
    <Page themeId="tool">
      <Header
        title="Terraform Environments"
        subtitle="Manage your ephemeral environments"
      />
      <Content>
        <ContentHeader title="Environments">
          <Button
            variant="contained"
            color="primary"
            onClick={handleRefresh}
            disabled={loading || !hasRequiredConfig}
            startIcon={<RefreshIcon />}
            className={classes.refreshButton}
          >
            Refresh
          </Button>
          <SupportButton>
            Manage your ephemeral environments created with Terraform.
          </SupportButton>
        </ContentHeader>
        
        {hasRequiredConfig && (
          <InfoCard
            title="Environment Configuration"
            className={classes.infoCard}
          >
            <Typography variant="body1">
              Displaying environments for:
            </Typography>
            <Typography variant="body2">
              <strong>Project:</strong> {projectName}<br />
              <strong>Organization:</strong> {orgName}<br />
              <strong>Squad:</strong> {squadName}<br />
              <strong>GitHub Repository:</strong> {owner}/{repo}
              {(!entity.metadata.annotations?.[ANNOTATION_GITHUB_OWNER] || !entity.metadata.annotations?.[ANNOTATION_GITHUB_REPO]) && (
                <Typography variant="caption" color="textSecondary" component="div">
                  Using {!entity.metadata.annotations?.[ANNOTATION_GITHUB_OWNER] ? 'owner' : ''} 
                  {!entity.metadata.annotations?.[ANNOTATION_GITHUB_OWNER] && !entity.metadata.annotations?.[ANNOTATION_GITHUB_REPO] ? ' and ' : ''}
                  {!entity.metadata.annotations?.[ANNOTATION_GITHUB_REPO] ? 'repo' : ''} from app-config.yaml
                </Typography>
              )}
            </Typography>
          </InfoCard>
        )}
        
        <Grid container spacing={3} direction="column">
          <Grid item>
            {renderContent()}
          </Grid>
        </Grid>
      </Content>
    </Page>
  );
}; 