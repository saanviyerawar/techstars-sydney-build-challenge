import { Link } from 'react-router-dom'

export default function Home() {
    return (
        <main>
            <div className="container mt-5 align-items-center justify-content-center">
                <div className="row justify-content-center">
                    <div className="col-md-6 text-center">
                        <h1 className="display-4 text-center">Discover Australia's Hidden Founders</h1>
                        <p className="lead text-center">Find and connect with high-potential current and future founders across Australia.</p>
                        <p className="mb-4 text-center">Our searchable database helps you discover diverse talent that's building the next wave of innovation - from scale-up veterans to PhD researchers with IP ready to spin out.</p>
                        <div className="d-grid gap-2 d-md-flex justify-content-center">
                            <Link to="/search" className="btn btn-primary btn-lg px-4 me-md-2">Start Searching</Link>
                        </div>
                    </div>
                </div>

                <div className="row mt-5">
                    <div className="col-12">
                        <h2 className="text-center mb-4">Why Hidden Founders?</h2>
                    </div>
                    <div className="col-md-4">
                        <div className="card h-100 border-0 shadow-sm">
                            <div className="card-body text-center p-4">
                                <div className="feature-icon bg-primary bg-gradient text-white rounded-circle mb-3">
                                    <i className="bi bi-search"></i>
                                </div>
                                <h3>Discover Talent</h3>
                                <p>Find high-potential founders before they're headlines. Our database surfaces talent that's not yet visible in traditional networks.</p>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-4">
                        <div className="card h-100 border-0 shadow-sm">
                            <div className="card-body text-center p-4">
                                <div className="feature-icon bg-primary bg-gradient text-white rounded-circle mb-3">
                                    <i className="bi bi-bar-chart"></i>
                                </div>
                                <h3>Diversity Insights</h3>
                                <p>Access detailed diversity metrics including gender, ethnicity, and migrant status to build more inclusive founder communities.</p>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-4">
                        <div className="card h-100 border-0 shadow-sm">
                            <div className="card-body text-center p-4">
                                <div className="feature-icon bg-primary bg-gradient text-white rounded-circle mb-3">
                                    <i className="bi bi-filter"></i>
                                </div>
                                <h3>Advanced Filtering</h3>
                                <p>Filter by expertise, background, location, and more to find exactly the founder profiles you're looking for.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row mt-5">
                    <div className="col-12">
                        <h2 className="text-center mb-4">Featured Founder Categories</h2>
                    </div>
                    <div className="col-md-3">
                        <div className="card category-card mb-4">
                            <div className="card-body">
                                <h3 className="h5">Scale-up Alumni</h3>
                                <p className="small">Experienced professionals from Australia's fastest-growing companies</p>
                                <Link to="/search" className="stretched-link" aria-label="Search scale-up alumni" />
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card category-card mb-4">
                            <div className="card-body">
                                <h3 className="h5">PhD Researchers</h3>
                                <p className="small">Academic innovators with IP ready for commercialization</p>
                                <Link to="/search" className="stretched-link" aria-label="Search PhD researchers" />
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card category-card mb-4">
                            <div className="card-body">
                                <h3 className="h5">Side Project Builders</h3>
                                <p className="small">Creators developing innovative products while employed</p>
                                <Link to="/search" className="stretched-link" aria-label="Search side project builders" />
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card category-card mb-4">
                            <div className="card-body">
                                <h3 className="h5">Migrant Founders</h3>
                                <p className="small">International entrepreneurs building in Australia</p>
                                <Link to="/search" className="stretched-link" aria-label="Search migrant founders" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>         
        </main>
    )
}