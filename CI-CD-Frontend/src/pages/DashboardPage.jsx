import React from 'react';
import { GitBranch, ShieldCheck, Radio } from 'lucide-react';
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

      {/* Mobile-Only Stat Cards (Screen 1: exactly 3 clean cards in 1 row, zero overlap) */}
      <div className="dashboard-mobile-stats">
        <div className="dash-m-card">
          <div className="dash-m-icon icon-blue">
            <GitBranch size={16} />
          </div>
          <span className="dash-m-label">Total Repositories</span>
          <div className="dash-m-value">4</div>
        </div>

        <div className="dash-m-card">
          <div className="dash-m-icon icon-green">
            <ShieldCheck size={16} />
          </div>
          <span className="dash-m-label">Connected</span>
          <div className="dash-m-val-group">
            <span className="dash-m-value">4</span>
            <span className="dash-m-badge badge-green">Active Sync</span>
          </div>
        </div>

        <div className="dash-m-card">
          <div className="dash-m-icon icon-yellow">
            <Radio size={16} />
          </div>
          <span className="dash-m-label">Pending</span>
          <div className="dash-m-val-group">
            <span className="dash-m-value">0</span>
            <span className="dash-m-badge badge-yellow">Requisite</span>
          </div>
        </div>
      </div>

      {/* Desktop Stat Cards (shown on > 768px) */}
      <div className="dashboard-desktop-stats">
        <StatsCards />
      </div>

      {/* Recent Pipelines (Screen 1) */}
      <div className="dashboard-recent-pipelines-section">
        <RecentPipelines />
      </div>

      {/* Desktop-Only Additional Widgets (hidden on mobile <= 768px to match Screen 1) */}
      <div className="dashboard-desktop-widgets">
        <div className="dashboard-middle-row">
          <PipelineRunsChart />
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
    </div>
  );
}
