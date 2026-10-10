const baseUrl = 'http://127.0.0.1:8081/api';
let adminToken, buyerToken, makerToken;
let adminId, buyerId, makerId;

async function runTests() {
    console.log("Starting E2E API Tests...");
    
    // 1. Test Login & Roles
    console.log("Logging in...");
    const aRes = await (await fetch(`${baseUrl}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: 'admin123' }) })).json();
    adminToken = aRes.token;
    
    const bRes = await (await fetch(`${baseUrl}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'user', password: 'user123' }) })).json();
    buyerToken = bRes.token;
    
    const mRes = await (await fetch(`${baseUrl}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'auctionmaker', password: 'maker123' }) })).json();
    makerToken = mRes.token;

    if (!adminToken || !buyerToken || !makerToken) {
        console.error("Login failed!", {aRes, bRes, mRes});
        process.exit(1);
    }
    
    // Get profiles
    const bProfile = await (await fetch(`${baseUrl}/auth/me`, { headers: { 'Authorization': `Bearer ${buyerToken}` } })).json();
    buyerId = bProfile.id;
    console.log("Buyer Profile:", bProfile.username, bProfile.role);

    // 3. Access Control (Buyer tries to hit admin users list)
    console.log("Testing Access Control...");
    const acRes = await fetch(`${baseUrl}/admin/users`, { headers: { 'Authorization': `Bearer ${buyerToken}` } });
    if (acRes.status !== 403 && acRes.status !== 401) {
        console.error("Access Control Failed! Buyer could access admin endpoint. Status:", acRes.status);
    } else {
        console.log("Access Control passed (Buyer forbidden from admin endpoint).");
    }

    // Admin hitting admin users list
    const acAdmin = await fetch(`${baseUrl}/admin/users`, { headers: { 'Authorization': `Bearer ${adminToken}` } });
    if (acAdmin.status !== 200) {
        console.error("Admin access failed. Status:", acAdmin.status);
    } else {
        console.log("Admin access passed.");
    }

    // 4. Profile persistence
    console.log("Testing Profile Persistence...");
    await fetch(`${baseUrl}/auth/me`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${buyerToken}` },
        body: JSON.stringify({ bankAccountNumber: '12345678', postalAddress: '123 Test St' })
    });
    
    const bProfileUpdated = await (await fetch(`${baseUrl}/auth/me`, { headers: { 'Authorization': `Bearer ${buyerToken}` } })).json();
    if (bProfileUpdated.bankAccountLast4 !== '5678') {
        console.error("Profile persistence failed!", bProfileUpdated);
    } else {
        console.log("Profile persistence passed.");
    }
    
    // 5. Wallet Ledger & Error States
    console.log("Testing Wallet Ledger & Errors...");
    const wRes = await fetch(`${baseUrl}/withdrawals/request`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${buyerToken}` },
        body: JSON.stringify({ amount: 50.00 })
    });
    
    const wBody = await wRes.text();
    console.log("Withdrawal Request Status:", wRes.status, "Body:", wBody);
    if (!wBody.includes("Insufficient") && !wBody.includes("KYC")) {
        console.error("Withdrawal error state failed! Should be rejected due to balance or KYC.");
    } else {
        console.log("Withdrawal error state passed.");
    }

    console.log("All E2E API tests completed.");
}

runTests().catch(console.error);
