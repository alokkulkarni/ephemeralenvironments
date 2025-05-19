import React from 'react';
import { useApi, errorApiRef } from '@backstage/core-plugin-api';
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
import RefreshIcon from '@material-ui/icons/Refresh';

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
  const errorApi = useApi(errorApiRef);
  const [environments, setEnvironments] = React.useState<Environment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | undefined>(undefined);
  const [refreshKey, setRefreshKey] = React.useState(0);

  // Fetch environments when component mounts or refreshKey changes
  React.useEffect(() => {
    const fetchEnvironments = async () => {
      try {
        setLoading(true);
        const data = await api.listEnvironments({});
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
  }, [api, refreshKey, errorApi]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleDestroy = async (id: string) => {
    try {
      setLoading(true);
      await api.destroyEnvironment({ id });
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
    if (loading && environments.length === 0) {
      return <Progress />;
    }

    if (error) {
      return <ErrorPanel error={error} />;
    }

    if (environments.length === 0) {
      return (
        <EmptyState
          missing="data"
          title="No Terraform environments found"
          description="You haven't created any Terraform environments yet."
        />
      );
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
            disabled={loading}
            startIcon={<RefreshIcon />}
            className={classes.refreshButton}
          >
            Refresh
          </Button>
          <SupportButton>
            Manage your ephemeral environments created with Terraform.
          </SupportButton>
        </ContentHeader>
        
        <Grid container spacing={3} direction="column">
          <Grid item>
            {renderContent()}
          </Grid>
        </Grid>
      </Content>
    </Page>
  );
}; 