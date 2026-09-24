export default function MigrantDropdown({ value, onChange }) {
    return (
        <select 
            className="form-select" 
            id="search-migrant" 
            value={value}
            onChange={(e) => onChange(e.target.value)}
        >
            <option value="">All</option>
            <option value="1">Migrant Founders</option>
            <option value="0">Non-Migrant Founders</option>
        </select>
    )
}