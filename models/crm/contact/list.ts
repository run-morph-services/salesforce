import { Crm }  from '@run-morph/models';
import { List, Resource, Metadata, Error }  from '@run-morph/sdk';

// Define metadata for the Salesforce Contact model
const metadata:Metadata<Crm.Contact> = {
	model: Crm.Contact,
	scopes: ['api', 'refresh_token', 'read']
};

// Export a new List operation
export default new List( async ( runtime, { page_size, cursor, sort, filter }) => { 

	// Construct Salesforce SOQL (Salesforce Object Query Language) query
	let soql = "SELECT Id, FirstName, LastName, Email, Phone, CreatedDate, LastModifiedDate FROM Contact";
	const sf_limit = page_size > 200 || page_size === null ? 200 : page_size;
	soql += ` LIMIT ${sf_limit}`;

	const sf_sort = sort ? mapSort(sort) : null;
	if (sf_sort) {
		soql += ` ORDER BY ${sf_sort}`;
	}

	const sf_filter = filter ? mapFilter(filter) : null;
	if(sf_filter){
		soql += ` WHERE ${sf_filter}`;
	}

	// Call Salesforce API
	const response = await runtime.proxy({
		method: 'GET',
		path: `/services/data/v49.0/query?q=${encodeURI(soql)}`
	});

	if(response.totalSize === 0){
        throw new Error(Error.Type.UNKNOWN_ERROR, "No contacts found");
    }

	// Prepare the next cursor and map resources for the response
	const next = response.done ? null : response.nextRecordUrl.match(/-[^-]*$/)[0];
	const resources = response.records.map(mapResource);

	// Return the resources and the next cursor for pagination
	return { 
		data:  resources, 
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
