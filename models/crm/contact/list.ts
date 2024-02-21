import { Crm }  from '@run-morph/models';
import { List, Resource, Metadata, Error }  from '@run-morph/sdk';

// Define metadata for the Salesforce Contact model
const metadata:Metadata<Crm.Contact> = {
	model: Crm.Contact,
	scopes: []
};

// Export a new List operation
export default new List( async ( runtime, { page_size, cursor, sort, filter }) => { 

    let soql = "SELECT Id, FirstName, LastName, Email, Phone, CreatedDate, LastModifiedDate FROM Contact";
    const sf_limit = page_size > 200 || page_size === null ? 200 : page_size;
	
    // Initialize the WHERE clause based on the cursor
    let whereClauses = [];

    // Apply filters from the mapFilter function if any filters are provided
    if (filter && Object.keys(filter).length > 0) {
        const filterClause = mapFilter(filter);
        if (filterClause) {
            whereClauses.push(filterClause);
        }
    }

    // Combine all WHERE clauses
    if (whereClauses.length > 0) {
        soql += " WHERE " + whereClauses.join(' AND ');
    }

    // Adjust the ORDER BY clause based on the sort parameter
    const orderByClause = mapSort(sort);
    soql += ` ORDER BY ${orderByClause} LIMIT ${sf_limit}`;

	// Set offset
	if (cursor?.offset) {
		soql  += ` OFFSET ${cursor.offset}`;
    }

    // Call Salesforce API
    const response = await runtime.proxy({
        method: 'GET',
        path: `/query`,
        params: {
            q: soql
        }
    });

    if(response.totalSize === 0){
        throw new Error(Error.Type.UNKNOWN_ERROR, "No contacts found");
    }

    // Assume there are more results if the number of records returned equals the limit
    let next = null;
    if (response.records.length === sf_limit) {
        next = {
			offset: cursor?.offset ? cursor.offset + response.records.length : response.records.length
		}
    }

	console.log('next',next)

    const resources = response.records.map(mapResource);

    return { 
        data:  resources, 
        next: next 
    };

}, metadata );


// Helper function to map Salesforce contacts to Contact resources
function mapResource(sf_contact){
	return new Resource({ 
		id: sf_contact.Id,
		data: {
			first_name: sf_contact.FirstName,
			last_name: sf_contact.LastName,
			email: sf_contact.Email,
			phone: sf_contact.Phone
		},
			created_at: new Date(sf_contact.CreatedDate).toISOString(),
			updated_at: new Date(sf_contact.LastModifiedDate).toISOString()
		}, Crm.Contact)
}

// Helper function to map sorting parameters
function mapSort(sort) {
    switch (sort) {
        case List.Sort.CREATED_AT_ASC:
            return 'CreatedDate ASC';
        case List.Sort.CREATED_AT_DESC:
            return 'CreatedDate DESC';
        case List.Sort.UPDATED_AT_ASC:
            return 'LastModifiedDate ASC';
        case List.Sort.UPDATED_AT_DESC:
            return 'LastModifiedDate DESC';
        default:
            return 'CreatedDate DESC';
    }
}

// Helper function to map filtering parameters
function mapFilter(filter) {
    const filterMapping = {
        first_name: 'FirstName',
        last_name: 'LastName',
        email: 'Email'
    };

    let sf_filters = [];
    for (let key in filter) {
        if (filter.hasOwnProperty(key) && filterMapping[key]) {
            sf_filters.push(`${filterMapping[key]} = '${filter[key]}'`);
        }
    }

    return sf_filters.join(' AND ');
}
