module.exports = {
    createStudent: [
        { model: 'name', required: true },
        { model: 'schoolId', required: true },
    ],
    updateStudent: [
        { model: 'id', required: true },
    ],
    transferStudent: [
        { model: 'id', required: true },
    ],
}
