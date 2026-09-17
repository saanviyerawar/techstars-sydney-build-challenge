# techstars-sydney-build-challenge
Won 1st place in the Techstars x Buildclub hackathon to find hidden founder talent in Sydney.

View demo here: https://youtu.be/4ms0X2m3uLA

## Collect real profile data with Selenium

The scraper uses Selenium with an authenticated Chrome session. Install Python
3.10+ and Google Chrome, then install the repository dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Either copy `linkedin-scraper\.env.example` to `linkedin-scraper\.env` and add
your LinkedIn credentials, or use the safer interactive login:

```powershell
python .\linkedin-scraper\main.py --manual-login `
  https://www.linkedin.com/in/example-profile
```

For multiple profiles, put one URL per line in a text file:

```powershell
python .\linkedin-scraper\main.py --manual-login `
  --urls-file .\linkedin-scraper\profile_urls.txt
```

Scraped JSON files are written to `linkedin-scraper\output`. Only collect and
use data you are authorized to process, and comply with LinkedIn's terms and
applicable privacy laws. The authenticated browser session is retained locally
in the ignored `linkedin-scraper\.chrome-profile` directory.

## Run the demo with scraped data

Build the frontend, then start Flask in its default scraped-data mode:

```powershell
cd .\client
npm ci
npm run build
cd ..
uv run --with-requirements .\server\requirements-demo.txt `
  python .\server\app.py
```

Open http://127.0.0.1:5000. The API loads the newest valid JSON file for each
profile from `linkedin-scraper\output`; no MySQL instance is required. Set
`DB_BACKEND=mysql` to use the original database implementation instead. On the
Search page, paste another LinkedIn profile URL into **Add a real LinkedIn
profile** to scrape it with the authenticated local browser session and add it
to the searchable dataset.

**1. What technology did you use to build your solution?**
We used a simple but powerful stack to move fast. The frontend was built with React, Vite.js, HTML, CSS, JavaScript, and Bootstrap for quick styling. For our backend, we use Python and Flask for the server and routing, with a MySQL database hosted on AWS RDS. The app is deployed on an AWS EC2 instance.

We used Selenium to extract public LinkedIn data and various search engine APIs to discover founders and gather additional startup-related information. Python packages, including pandas and pydantic, were used for data handling and validation, while Gemini and regex were applied to summarise descriptions and tag the data into clean, searchable fields.

**2. How does your solution work? (What do you scrape, how do you scrape, how does the filtering work?)**
We identify hidden founders by combining smart search techniques with scraping and enrichment. Using search APIs, we run targeted queries like “site:linkedin.com/in” combined with Australian cities and founder-related terms. We also apply snippet-level filters to exclude more visible profiles — for example, filtering out individuals with a high follower count or extended tenure in their current founder roles, which may suggest they’re not “hidden” founders. In parallel, we surface founders who are highly active in university and startup Slack communities,
particularly valuable for discovering female founders through women-only groups.

Once we’ve collected LinkedIn URLs, we scrape public profile data using Selenium via an open-source GitHub repo. This yields structured JSON containing work experience and education. We use search APIs again to extract additional info (i.e., startup funding, industry) by querying Crunchbase and the broader web, applying snippet-level filters for accuracy.

Gemini and regex are then applied to both the scraped and enriched data to extract key tags such as “past founder,” “was in accelerator,” “scaleup alumni, “founder persona,” “highest degree,” “migrant founder,” “working in stealth,” and more.

When users select filters on the frontend, these are sent to the backend via a POST route. The backend queries the structured database and returns matching profiles for display.

**3. How long did it take to build?**
We joined with 10 days left and built the solution in about a week, working on it in bursts around other commitments.

**4. Why are you excited about AI?**
We’re excited about AI because it helps interpret, summarise, and act on complex information at scale. It mimics human reasoning and unlocks new possibilities across research, product-building, and discovery.

In this project, AI played a key role. We used Gemini on the output from the search APIs to summarise startup descriptions and infer industries, especially where regex struggled with variability. Regex remains valuable for consistent patterns, and we use it where appropriate, but AI adds flexibility and context-awareness.

AI also accelerated our product development, giving us more time to focus on software architecture and explore creative approaches to founder discovery. As AI models improve and become more accessible, they’ll increasingly complement traditional systems, enabling more accurate, scalable, and less manual solutions for real-world tasks. That’s what makes AI exciting!

**5. Why were you excited about this challenge?**
This was our first hackathon, so we were excited by the opportunity to build, ship and deploy a full-stack MVP end-to-end in a short timeframe.
What made the challenge especially exciting was the problem itself. It wasn’t just about building an app — it was about being creative in how we uncovered hidden founders, how we automated that discovery and tagging process, and how we designed a system to make it scalable. It pushed us to explore the full stack, apply AI in practical ways, and bring a functional, data-rich product to life.

**6. Why do you think challenges like this matter?**
Challenges like this matter because they shine a light on overlooked talent, especially underrepresented minorities like women and migrant founders, who are often underfunded and underestimated by VCs. This challenge wasn’t just about building tech; it was about finding new ways to surface voices and builders that the mainstream ecosystem tends to miss. Creating opportunities to discover and uplift these founders is incredibly important, and challenges like this play a small but powerful role in making that happen.

**7. Any other words/advice**
One of our biggest lessons was the importance of early planning and clear system design. 

Michelle focused on the process of discovering hidden founders, data scraping, extraction, and tagging, while Andy led the full-stack development, including the database, backend logic, and user interface. Since we were building in parallel, staying in sync was critical. Some fields evolved as we went, which forced us to adapt quickly and rethink parts of the architecture. It reminded us how important it is to scope well but stay flexible, especially when working with messy, real-world data.

This was also our first time teaming up, and it was rewarding to see how our different skill sets came together to turn an idea into a functional product, end to end.

**8. What are some possible next steps?**
The next steps for this project would focus on expanding and refining both the dataset and the product experience. We plan to grow the database to include more hidden founders, especially from cities beyond Sydney. On the frontend, we’d like to introduce a toggle between card and table views for easier browsing and sorting. On the backend, we aim to support real-time updates to founder profiles, implement caching to improve search and filter performance, and build safeguards against invalid scrapes, especially as we move toward automating the web
scrape–to–database pipeline.

We’re exploring new ways to automate founder discovery, such as scraping likes and comments on posts from prominent Australian AI thought leaders/founders on LinkedIn, where many hidden builders engage. We're also experimenting with signals from GitHub, Discord, X/Twitter,
and past hackathon winners to identify emerging talent.

To boost data accuracy, we’ll refine our Gemini prompts and search filters. We also plan to scale our scraping pipeline using parallel Selenium, proxies, throttling, and account rotation — enabling broader, more reliable data collection while avoiding detection.

Lastly, we plan to introduce a scoring system — a numeric metric to highlight hidden founders with high potential. This would help users quickly identify standout profiles without needing to manually combine multiple filters.
