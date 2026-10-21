import React from 'react';
import StatsCards from '../components/StatsCards';
import PipelineRunsChart from '../components/PipelineRunsChart';
import RecentPipelines from '../components/RecentPipelines';
import PipelineActivity from '../components/PipelineActivity';
import LiveLogs from '../components/LiveLogs';
import PipelineDetails from '../components/PipelineDetails';
import Artifacts from '../components/Artifacts';
import Deployment from '../components/Deployment';
import Repositories from '../components/Repositories';
import archiImg from '../assets/archi.png';
import './DashboardPage.css';

export default function DashboardPage() {
  return (
    <div className="dashboard-page">
      {/* Dashboard Page Header (Screen 1) */}
      <div className="dashboard-header-section">
        <h1 className="dashboard-title">Dashboard</h1>
        <p className="dashboard-subtitle">Overview of your CI/CD pipelines and deployments</p>
      </div>

      {/* Hero Architecture Banner (Screen 1) */}
      <div className="dashboard-hero-banner">
        <img src={archiImg} alt="Cloud Architecture Overview" className="dashboard-hero-img" />
      </div>

      <StatsCards />

      <div className="dashboard-middle-row">
        <PipelineRunsChart />
        <RecentPipelines />
        <PipelineActivity />
      </div>
      <div className="dashboard-bottom-row">
        <LiveLogs />
        <PipelineDetails />
      </div>
      <div className="dashboard-details-row">
        <Artifacts />
        <Deployment />
      </div>
      <div className="dashboard-repos-row">
        <Repositories />
      </div>
    </div>
  );
}
