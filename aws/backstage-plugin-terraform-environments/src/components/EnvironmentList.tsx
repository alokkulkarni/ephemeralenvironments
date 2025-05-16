import React from 'react';
import {
  Table,
  TableColumn,
  ResponseErrorPanel,
  StatusOK,
  StatusWarning,
  StatusError,
} from '@backstage/core-components';
import { Environment } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { IconButton, Menu, MenuItem } from '@material-ui/core';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import DeleteIcon from '@material-ui/icons/Delete';

interface EnvironmentListProps {
  environments: Environment[];
  loading: boolean;
  error?: Error;
  onDestroy: (id: string) => Promise<void>;
}

export const EnvironmentList = ({
  environments,
  loading,
  error,
  onDestroy,
}: EnvironmentListProps) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [selectedEnv, setSelectedEnv] = React.useState<Environment | null>(null);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, env: Environment) => {
    setAnchorEl(event.currentTarget);
    setSelectedEnv(env);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedEnv(null);
  };

  const handleDestroy = async () => {
    if (selectedEnv) {
      await onDestroy(selectedEnv.id);
      handleMenuClose();
    }
  };

  const columns: TableColumn<Environment>[] = [
    {
      title: 'Name',
      field: 'name',
      highlight: true,
    },
    {
      title: 'Project',
      field: 'project',
    },
    {
      title: 'Organization',
      field: 'organization',
    },
    {
      title: 'Squad',
      field: 'squad',
    },
    {
      title: 'Environment',
      field: 'environment',
    },
    {
      title: 'Status',
      field: 'status',
      render: (env: Environment) => {
        switch (env.status) {
          case 'open':
            return <StatusOK>Active</StatusOK>;
          case 'closed':
            return <StatusError>Destroyed</StatusError>;
          default:
            return <StatusWarning>{env.status}</StatusWarning>;
        }
      },
    },
    {
      title: 'Created',
      field: 'createdAt',
      render: (env: Environment) => formatDistanceToNow(new Date(env.createdAt), { addSuffix: true }),
    },
    {
      title: 'Updated',
      field: 'updatedAt',
      render: (env: Environment) => formatDistanceToNow(new Date(env.updatedAt), { addSuffix: true }),
    },
    {
      title: 'Actions',
      field: 'actions',
      render: (env: Environment) => (
        <>
          <IconButton
            aria-label="more"
            aria-controls="environment-menu"
            aria-haspopup="true"
            onClick={(e) => handleMenuClick(e, env)}
          >
            <MoreVertIcon />
          </IconButton>
          <Menu
            id="environment-menu"
            anchorEl={anchorEl}
            keepMounted
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={handleDestroy}>
              <DeleteIcon fontSize="small" style={{ marginRight: 8 }} />
              Destroy Environment
            </MenuItem>
          </Menu>
        </>
      ),
    },
  ];

  if (error) {
    return <ResponseErrorPanel error={error} />;
  }

  return (
    <Table
      title="Environments"
      options={{
        search: true,
        paging: true,
        pageSize: 10,
        sorting: true,
        filtering: true,
      }}
      columns={columns}
      data={environments}
      isLoading={loading}
      emptyContent={
        <div style={{ textAlign: 'center', padding: '20px' }}>
          No environments found. Create a new environment using the Backstage template.
        </div>
      }
    />
  );
}; 