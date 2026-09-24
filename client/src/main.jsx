import ReactDOM from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import './input.css'

import App from './App'
import Home from './pages/Home'
import Search from './pages/Search'
import FounderProfile from './pages/Founder'
import AboutPage from './pages/About'

const router = createHashRouter([
    {
        path: '/',
        element: <App />,
        errorElement: <div>Something went wrong</div>,
        children: [
            {
                index: true,
                element: <Home />
            }, {
                path: '/search',
                element: <Search />
            }, {
                path: '/founder/:founderId',
                element:<FounderProfile />
            }, {
                path: '/about',
                element: <AboutPage />
            }
        ]
    }
])

ReactDOM.createRoot(document.getElementById('root')).render(
    <RouterProvider router={router} />
)