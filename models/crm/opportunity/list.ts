import { Crm, Generic }  from '@run-morph/models';
import { List, Resource, Metadata, Error, ResourceRef }  from '@run-morph/sdk';

// Define metadata for the Salesforce Contact model
const metadata:Metadata<Crm.Opportunity> = {
	model: Crm.Opportunity,
	scopes: []
};

// Export a new List operation
export default new List( async ( runtime, { page_size, cursor, sort, filter }) => { 

    let soql = "SELECT Id, Name, Amount, StageName, AccountId, ContactId, OwnerId, CloseDate, CreatedDate, LastModifiedDate FROM Opportunity";
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
	console.log(soql)
    // Call Salesforce API
    const response = await runtime.proxy({
        method: 'GET',
        path: `/query`,
        params: {
            q: soql
        }
    });

    if(response.totalSize === 0){
        throw new Error(Error.Type.UNKNOWN_ERROR, "No opportunity found");
    }

    // Assume there are more results if the number of records returned equals the limit
    let next = null;
    if (response.records.length === sf_limit) {
        next = {
			offset: cursor?.offset ? cursor.offset + response.records.length : response.records.length
		}
    }

	console.log('next',next)

    const sf_oppo_stages = await runtime.proxy({
		method: 'GET',
		path: `/query`,
		params: {
			q: `SELECT Id, MasterLabel,ForecastCategoryName,IsActive,DefaultProbability FROM OpportunityStage` 
		}
	});

    const resources = response.records.map((oppo) => mapResource(oppo, sf_oppo_stages));

    return { 
        data:  resources, 
        next: next 
    };

}, metadata );


// Helper function to map Salesforce contacts to Contact resources
function mapResource(sf_opportunity, sf_oppo_stages){

    const stage_id = sf_oppo_stages.records.filter((sf_stage) => sf_stage.MasterLabel === sf_opportunity.StageName)[0]?.Id.substring(0, 15) || null;
	return new Resource({ 
		id: sf_opportunity.Id.substring(0, 15),
		data: {
			name: sf_opportunity.Name,
			amount: sf_opportunity.Amount,
			currency: null,
			closed_at: sf_opportunity.CloseDate,
			pipeline: new ResourceRef({id: 'Opportunity'}, Crm.Pipeline),
			stage: stage_id ? new ResourceRef({id: stage_id}, Crm.Stage) : null,
			contacts: sf_opportunity.ContactId ? [new ResourceRef({ id: sf_opportunity.ContactId.substring(0, 15) }, Generic.Contact)] : [],
			companies:sf_opportunity.AccountId? [new ResourceRef({ id: sf_opportunity.AccountId.substring(0, 15) }, Generic.Company)] : [],
			owner: sf_opportunity.OwnerId ? new ResourceRef({ id: sf_opportunity.OwnerId.substring(0, 15) }, Generic.User) : null
		},
        remote_data: sf_opportunity,
        created_at: new Date(sf_opportunity.CreatedDate).toISOString(),
        updated_at: new Date(sf_opportunity.LastModifiedDate).toISOString()
		}, Crm.Opportunity)
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
        name: 'Name',
    };

    let sf_filters = [];
    for (let key in filter) {
        if (filter.hasOwnProperty(key) && filterMapping[key]) {
            sf_filters.push(`${filterMapping[key]} = '${filter[key]}'`);
        }
    }

    return sf_filters.join(' AND ');
}


/*
// Export a new List operation
export default new List(async (runtime, { page_size, cursor, sort, filter }) => {
  // Initialize the request body with default values for Salesforce API
  const body = {
    sorts: [],
    filterGroups: [],
    limit: 50, // Default limit
    properties: [
      'Amount', 'AccountId', 'CloseDate', 'Name', 'StageName', 'OwnerId', 'CurrencyIsoCode' // Adjusted for Salesforce fields
    ],
    after: cursor?.after || null
  }

  // Adjust limit, sort, and filter based on input parameters
  const sf_limit = page_size > 50 || page_size === null ? 50 : page_size;
  const sf_sort = sort ? mapSort(sort) : null;
  const sf_filter = filter ? mapFilter(filter) : null;

  if (sf_limit) {
    body.limit = sf_limit;
  }

  if (sf_sort) {
    body.sorts.push(sf_sort)
  }

  if (sf_filter) {
    body.filterGroups.push({ filters: sf_filter })
  }

  // Call the Salesforce search API
  const response = await runtime.proxy({
    method: 'POST',
    path: '/services/data/vXX.0/query/', // Adjust the path for Salesforce API version
    body: `SELECT ${body.properties.join(', ')} FROM Opportunity WHERE Id > '${body.after}' ORDER BY ${sf_sort} LIMIT ${body.limit}` // Adjusted query for Salesforce SOQL
  });

  console.log(response.records[0])

  // Handle errors from the API response
  if (response.status === 'error') {
    switch (response.category) {
      default:
        throw new Error(Error.Type.UNKNOWN_ERROR, response.message);
    }
  }

  // Prepare the next cursor and map resources for the response
  const next = response?.done ? null : response.records[response.records.length - 1].Id; // Adjusted for Salesforce response structure
  const resources = [];
  for (const result of response.records) {
    const resource = await mapResource(result);
    resources.push(resource);
  }

  // Return the resources and the next cursor for pagination
  return {
    data: resources,
    next: next
  };

}, metadata);

// Helper function to map Salesforce Opportunity to Crm.Opportunity resource
async function mapResource(sf_opportunity) {
	return new Resource({ 
		id: sf_opportunity.Id,
		data: {
			name: sf_opportunity.Name,
			amount: parseFloat(sf_opportunity.Amount),
			currency: sf_opportunity.CurrencyIsoCode,	
			contacts:[],
			companies: []	
		},
		created_at: new Date(sf_opportunity.CloseDate).toISOString(),
		updated_at: new Date(sf_opportunity.CloseDate).toISOString(),
		remote_data: sf_opportunity
	},
	Crm.Opportunity)
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

function mapFilter(filter: Record<string, any>): string {
    const filterMapping: Record<string, string> = {
        name: 'Name',
        // Extend with more mappings as necessary
    };

    let sfFilters: string[] = [];
    Object.keys(filter).forEach(key => {
        const sfField = filterMapping[key];
        if (sfField && filter[key] !== undefined) {
            sfFilters.push(`${sfField} = '${filter[key]}'`);
        }
    });

    return sfFilters.length > 0 ? sfFilters.join(' AND ') : '1=1'; // Returns '1=1' if no filters to ensure valid SOQL
}*/