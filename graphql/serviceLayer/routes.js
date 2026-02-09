

export const enforceAuthenticatedAccess = (userId) => {
    if (!userId) throw new Error("Unauthorized request on private route (not logged in)");
    return true;
}

export const enforceAdminOnlyAccess = (userRole) => {
    if(userRole != "admin") throw new Error("Unauthorized request on protected data");
    return true
}