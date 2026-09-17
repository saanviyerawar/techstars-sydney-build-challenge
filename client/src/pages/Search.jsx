import React, { useState, useEffect } from 'react'
import FounderCard  from '../components/FounderCard';
import GenderDropdown from '../components/GenderDropdown';
import IndustryTagsDropdown from '../components/IndustryDropdown';
import PersonaTagsDropdown from '../components/PersonaDropdown';
import FundingTagsDropdown from '../components/FundingDropdown';
import TagsDropdown from '../components/Tags';
import MigrantDropdown from '../components/Migrant';
import Pagination from '../components/Pagination';
import HighestDegree from '../components/HighestEducation';
import { 
    initTooltips,
    initPopovers,
    makeTablesResponsive,
    setupScrollAnimation
 } from '../../utils/helper';

export default function Search() {
    const [debouncedNameFilter, setDebouncedNameFilter] = useState('');
    const [debouncedStartupFilter, setDebouncedStartupFilter] = useState('');
    const [debouncedCityFilter, setDebouncedCityFilter] = useState('');
    const [founders, setFounders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [nameFilter, setNameFilter] = useState('');
    const [cityFilter, setCityFilter] = useState('');
    const [startupFilter, setStartupFilter] = useState('');
    const [ highestDegreeFilter, setHighestDegreeFilter] = useState('');
    const [genderFilter, setGenderFilter] = useState('');
    const [migrantFilter, setMigrantFilter] = useState('');
    const [tagsFilter, setTagsFilter] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [industryFilter, setIndustryFilter] = useState('');
    const [fundingFilter, setFundingFilter] = useState('');
    const [personaFilter, setPersonaFilter] = useState('');
    const [sortBy, setSortBy] = useState('name');
    const [profileUrl, setProfileUrl] = useState('');
    const [scraping, setScraping] = useState(false);
    const [scrapeError, setScrapeError] = useState(null);
    const foundersPerPage = 10;

    const indexOfLastFounder = currentPage * foundersPerPage;
    const indexOfFirstFounder = indexOfLastFounder - foundersPerPage;
    // const currentFounders = founders.slice(indexOfFirstFounder, indexOfLastFounder);
    
    let sortedFounders = [...founders];
    if (sortBy === 'city') {
    // sortedFounders.sort((a, b) => (a.city || '').localeCompare(b.city || ''));
    sortedFounders.sort((a, b) => {
        if (!a.city && b.city) return 1;   // a is blank, b is not: a after b
        if (a.city && !b.city) return -1;  // a is not blank, b is: a before b
        return (a.city || '').localeCompare(b.city || '');
    });
    } else if (sortBy === 'name') {
    sortedFounders.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    const currentFounders = sortedFounders.slice(indexOfFirstFounder, indexOfLastFounder);
    
    const totalPages = Math.ceil(founders.length / foundersPerPage);
    
    const resetFilters = () => {
        setNameFilter('');
        setCityFilter('');
        setStartupFilter('');
        setGenderFilter('');
        setMigrantFilter('');
        setTagsFilter([]);
        setIndustryFilter('');
        setPersonaFilter('');
        setFundingFilter('');
    };

    const scrapeProfile = async (event) => {
        event.preventDefault();
        setScraping(true);
        setScrapeError(null);

        try {
            const response = await fetch('/api/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: profileUrl }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }
            setFounders((current) => [
                data,
                ...current.filter((founder) => founder.linkedin_url !== data.linkedin_url),
            ]);
            setProfileUrl('');
            setCurrentPage(1);
        } catch (error) {
            setScrapeError(error.message);
        } finally {
            setScraping(false);
        }
    };

    useEffect(() => {
        if (highestDegreeFilter) {
            setTagsFilter((prevTags) => {
                const degreeTags = ['Bachelors', 'Masters', 'PhD'];
                const filteredTags = prevTags.filter(tag => !degreeTags.includes(tag));

                return [...filteredTags, highestDegreeFilter];
            });
        } else {
            setTagsFilter((prevTags) => prevTags.filter(tag => !['Bachelor', 'Masters', 'PhD'].includes(tag)));
        }
    }, [highestDegreeFilter]);

    useEffect(() => {
        const params = new URLSearchParams();
    
        if (nameFilter) params.append('name', nameFilter);
        if (cityFilter) params.append('city', cityFilter);
        if (startupFilter) params.append('startup', startupFilter);
        if (genderFilter) params.append('gender', genderFilter);
        if (migrantFilter) params.append('migrant', migrantFilter);
        if (personaFilter) params.append('founder_persona', personaFilter);
        if (industryFilter) params.append('curr_startup_industry', industryFilter);
        if (fundingFilter) params.append('curr_startup_funding_stage', fundingFilter)

        if (tagsFilter.length > 0) {
            tagsFilter.forEach(tag => params.append('tags', tag)); 
        }
        
        setLoading(true);

        fetch(`/api/search?${params.toString()}`)
            .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
            })
            .then((data) => {
            setFounders(data);
            setCurrentPage(1);
            setLoading(false);
            })
            .catch((error) => {
            console.error('Error fetching data:', error);
            setError(error);
            setLoading(false);
        });
    }, [nameFilter, cityFilter, startupFilter, genderFilter, migrantFilter, tagsFilter, personaFilter, industryFilter, fundingFilter]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedNameFilter(nameFilter);
            setDebouncedStartupFilter(startupFilter);
            setDebouncedCityFilter(cityFilter);
        }, 5000);
        
        return () => clearTimeout(timer);
    }, [nameFilter, startupFilter, cityFilter]);

    useEffect(() => {
    if (!loading && founders.length > 0) {
        initTooltips();
        initPopovers();
        makeTablesResponsive();
        setupScrollAnimation();
    }
    }, [loading, founders]);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentPage]);
    return (
        <main>
            <div className="container mt-4">
                <div className="row">
                    <div className="col-12">
                        <h1>Search Hidden Founders</h1>
                        <p className="lead">Find high-potential founders across Australia using advanced filters.</p>
                    </div>
                </div>

                <div className="row mt-3">
                    <div className="col-md-3">
                        <div className="card shadow-sm mb-4">
                            <div className="card-header bg-light">
                                <h5 className="card-title mb-0">Filters</h5>
                            </div>
                            <div className="card-body">
                                <form id="search-form" onSubmit={(e) => e.preventDefault()}>

                                    <h6 className="mb-3">Founder Filters</h6>

                                    <div className="mb-3">
                                        <label htmlFor="search-name" className="form-label">Name</label>
                                        <input type="text" className="form-control" id="search-name" placeholder="Enter name" value={nameFilter} onChange={(e) => setNameFilter(e.target.value)}/>
                                    </div>
                                    
                                    <div className="mb-3">
                                        <label htmlFor="search-city" className="form-label">City</label>
                                        <input type='text' className="form-control" id="search-city" placeholder="Enter city" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
                                        </input>
                                    </div>

                                    <PersonaTagsDropdown
                                        value={personaFilter}
                                        onChange={setPersonaFilter}
                                    />

                                    <div className="mb-3">
                                        <label htmlFor="search-degree" className="form-label">Highest Level Degree</label>
                                        <HighestDegree 
                                            value={highestDegreeFilter}
                                            onChange={setHighestDegreeFilter}    
                                        />
                                    </div>  
                                    
                                    <div className="mb-3">
                                        <label className="form-label">Tags</label>
                                        <TagsDropdown
                                            value={tagsFilter}
                                            onChange={setTagsFilter}
                                        />
                                    </div>

                                    <hr/>

                                    <h6 className="mb-3">Current Startup Filters</h6>

                                    <div className="mb-3">
                                        <label htmlFor="search-startup" className="form-label">Startup Name</label>
                                        <input type="text" className="form-control" id="search-startup" placeholder="Enter startup name" value={startupFilter} onChange={(e) => setStartupFilter(e.target.value)}/>
                                    </div>

                                    <IndustryTagsDropdown
                                        value={industryFilter}
                                        onChange={setIndustryFilter}
                                    />

                                    <FundingTagsDropdown
                                        value={fundingFilter}
                                        onChange={setFundingFilter}
                                    />

                                    <hr/>

                                    <h6 className="mb-3">Diversity Filters</h6>
                                    
                                    <GenderDropdown
                                        value={genderFilter}
                                        onChange={setGenderFilter}
                                    />
                                
                                    <div className="mb-3">
                                        <label htmlFor="search-migrant" className="form-label">Migrant Status</label>
                                        <MigrantDropdown 
                                            value={migrantFilter}
                                            onChange={setMigrantFilter}    
                                        />
                                    </div>                                   
                                    
                                    <div className="d-grid">
                                        <button type="submit" className="btn btn-primary">Apply Filters</button>
                                        <button type="button" className="btn btn-outline-secondary mt-2" id="reset-filters" onClick={resetFilters}>
                                            Reset Filters
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                    
                    <div className="col-md-9">
                        <div className="card shadow-sm mb-4">
                            <div className="card-body">
                                <h5 className="card-title">Add a real LinkedIn profile</h5>
                                <p className="text-muted small">
                                    Enter a public profile URL. Selenium will use your local authenticated browser session.
                                </p>
                                <form className="d-flex gap-2" onSubmit={scrapeProfile}>
                                    <input
                                        type="url"
                                        className="form-control"
                                        placeholder="https://www.linkedin.com/in/profile"
                                        value={profileUrl}
                                        onChange={(event) => setProfileUrl(event.target.value)}
                                        required
                                    />
                                    <button className="btn btn-primary" type="submit" disabled={scraping}>
                                        {scraping ? 'Adding...' : 'Add profile'}
                                    </button>
                                </form>
                                {scrapeError && (
                                    <div className="alert alert-danger mt-3 mb-0" role="alert">
                                        {scrapeError}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="card shadow-sm mb-4">
                            <div className="card-header bg-light d-flex justify-content-between align-items-center">
                                <h5 className="card-title mb-0">Results <span id="result-count" className="badge bg-primary ms-2">{ founders.length }</span></h5>
                                <div className="d-flex align-items-center">
                                    <label htmlFor="sort-by" className="form-label me-2 mb-0">Sort by:</label>
                                    <select 
                                        className="form-select form-select-sm"
                                        id="sort-by"
                                        style={{ width: 'auto' }}
                                        value={sortBy}
                                        onChange={e => setSortBy(e.target.value)}>
                                        {/* <option>Default</option> */}
                                        <option value="name">Name</option>
                                        <option value="city">City</option>
                                    </select>
                                </div>
                            </div>
                            <div className="card-body">
                                { loading ? (
                                    <div id="search-results" className="row">
                                        <div className="col-12 text-center py-5">
                                            <div className="spinner-border text-primary" role="status">
                                                <span className="visually-hidden">Loading...</span>
                                            </div>
                                            <p className="mt-3">Loading founders...</p>
                                        </div>
                                    </div>

                                ) : error ? (
                                    <div className="alert alert-danger" role="alert">
                                        Error fetching data: {error.message}
                                    </div>                                  
                                ): founders.length === 0 ? ( 
                                    <div className="alert alert-warning" role="alert">
                                        No founders found.
                                    </div>                                    
                                ) : (
                                    <div className="row" id="search-results">
                                        {currentFounders.map((founder) => (
                                        <FounderCard key={founder.id} founder={founder} />
                                        ))}
                                    </div>                                   
                                )}
                                
                                <div id="pagination" className="d-flex justify-content-center mt-4">
                                    {totalPages > 1 && (
                                        <Pagination
                                            currentPage={currentPage}
                                            totalPages={totalPages}
                                            setCurrentPage={setCurrentPage}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>            
        </main>
    )
}