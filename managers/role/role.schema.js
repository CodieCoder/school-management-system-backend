module.exports = {
    createRole: [
        { model: 'schoolId', required: true },
        { model: 'name', required: true },
        { model: 'permissions', required: true },
    ],
    updateRole: [
        { model: 'roleId', required: true },
    ],
}
