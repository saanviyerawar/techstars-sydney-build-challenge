export default function HighestDegree({ value, onChange }) {
    return (
        <select 
            className="form-select" 
            id="search-degree" 
            value={value}
            onChange={(e) => onChange(e.target.value)}
        >
            <option value="">All</option>
            <option value="Bachelor">Bachelor</option>
            <option value="Masters">Masters</option>
            <option value="PhD">PhD</option>
        </select>
    )
}