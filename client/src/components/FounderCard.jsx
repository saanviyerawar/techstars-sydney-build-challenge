import React from 'react';
import { Link } from 'react-router-dom';

export default function FounderCard({ founder }) {
  return (
    <div className="col-md-6 mb-4">
      <div className="card h-100 founder-card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-start">
            <h5 className="card-title founder-name mb-0">{founder.name}</h5>
          </div>
          <p className="text-muted mb-2">
            <i className="bi bi-geo-alt"></i> {founder.city}
          </p>
          <p className="founder-role mb-2">
            {founder.current_title}
            {founder.current_title !== "Unemployed" && founder.current_title && founder.current_company && ` at ${founder.current_company}`}
            <span className="text-muted">
              {founder.current_job_start && ` (Started: ${founder.current_job_start})`}
            </span>
          </p>
          <div className="founder-tags mb-3">
            {founder.tags && founder.tags.map((tag, index) => (
              <span key={index} className="badge bg-secondary me-1">{tag}</span>
            ))}
          </div>
          <div className="diversity-badges mb-3">
            {founder.diversity && founder.diversity.map((badge, index) => (
              <span key={index} className="badge bg-info me-1">{badge}</span>
            ))}
          </div>
          <Link to={`/founder/${founder.id}`} className="btn btn-sm btn-outline-primary me-2">
            View Profile
          </Link>
          <a href={founder.linkedin_url} className="btn btn-sm btn-outline-secondary" target="_blank" rel="noopener noreferrer">
            <i className="bi bi-linkedin"></i> LinkedIn
          </a>
        </div>
      </div>
    </div>
  );
}