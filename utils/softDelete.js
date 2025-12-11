// Soft Delete Helper Functions
// Sử dụng cho tất cả models để xóa mềm thay vì xóa cứng

/**
 * Thêm soft delete fields vào schema
 * Sử dụng: Thêm vào schema definition
 */
const softDeleteFields = {
    deleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: require('mongoose').Schema.Types.ObjectId, ref: 'userModel', default: null }
};

/**
 * Soft delete một document
 * @param {Model} model - Mongoose model
 * @param {String} id - Document ID
 * @param {String} userId - User ID thực hiện xóa
 */
async function softDelete(model, id, userId = null) {
    return await model.findByIdAndUpdate(
        id,
        {
            deleted: true,
            deletedAt: new Date(),
            deletedBy: userId
        },
        { new: true }
    );
}

/**
 * Soft delete nhiều documents
 * @param {Model} model - Mongoose model
 * @param {Object} filter - Filter query
 * @param {String} userId - User ID thực hiện xóa
 */
async function softDeleteMany(model, filter, userId = null) {
    return await model.updateMany(
        filter,
        {
            deleted: true,
            deletedAt: new Date(),
            deletedBy: userId
        }
    );
}

/**
 * Restore một document đã xóa
 * @param {Model} model - Mongoose model
 * @param {String} id - Document ID
 */
async function restore(model, id) {
    return await model.findByIdAndUpdate(
        id,
        {
            deleted: false,
            deletedAt: null,
            deletedBy: null
        },
        { new: true }
    );
}

/**
 * Tìm tất cả documents chưa bị xóa
 * @param {Model} model - Mongoose model
 * @param {Object} filter - Filter query
 */
async function findNotDeleted(model, filter = {}) {
    return await model.find({ ...filter, deleted: false });
}

/**
 * Tìm một document chưa bị xóa
 * @param {Model} model - Mongoose model
 * @param {Object} filter - Filter query
 */
async function findOneNotDeleted(model, filter = {}) {
    return await model.findOne({ ...filter, deleted: false });
}

/**
 * Tìm document by ID chưa bị xóa
 * @param {Model} model - Mongoose model
 * @param {String} id - Document ID
 */
async function findByIdNotDeleted(model, id) {
    return await model.findOne({ _id: id, deleted: false });
}

/**
 * Count documents chưa bị xóa
 * @param {Model} model - Mongoose model
 * @param {Object} filter - Filter query
 */
async function countNotDeleted(model, filter = {}) {
    return await model.countDocuments({ ...filter, deleted: false });
}

/**
 * Middleware để tự động filter deleted documents
 * Thêm vào schema: schema.plugin(softDeletePlugin)
 */
function softDeletePlugin(schema) {
    // Thêm fields vào schema
    schema.add(softDeleteFields);

    // Middleware cho find queries
    schema.pre('find', function () {
        if (!this.getOptions().includeDeleted) {
            this.where({ deleted: false });
        }
    });

    schema.pre('findOne', function () {
        if (!this.getOptions().includeDeleted) {
            this.where({ deleted: false });
        }
    });

    schema.pre('countDocuments', function () {
        if (!this.getOptions().includeDeleted) {
            this.where({ deleted: false });
        }
    });

    // Methods
    schema.methods.softDelete = function (userId = null) {
        this.deleted = true;
        this.deletedAt = new Date();
        this.deletedBy = userId;
        return this.save();
    };

    schema.methods.restore = function () {
        this.deleted = false;
        this.deletedAt = null;
        this.deletedBy = null;
        return this.save();
    };

    // Statics
    schema.statics.findNotDeleted = function (filter = {}) {
        return this.find({ ...filter, deleted: false });
    };

    schema.statics.findOneNotDeleted = function (filter = {}) {
        return this.findOne({ ...filter, deleted: false });
    };

    schema.statics.findByIdNotDeleted = function (id) {
        return this.findOne({ _id: id, deleted: false });
    };

    schema.statics.countNotDeleted = function (filter = {}) {
        return this.countDocuments({ ...filter, deleted: false });
    };

    schema.statics.softDelete = function (id, userId = null) {
        return this.findByIdAndUpdate(
            id,
            {
                deleted: true,
                deletedAt: new Date(),
                deletedBy: userId
            },
            { new: true }
        );
    };

    schema.statics.restore = function (id) {
        return this.findByIdAndUpdate(
            id,
            {
                deleted: false,
                deletedAt: null,
                deletedBy: null
            },
            { new: true }
        );
    };
}

module.exports = {
    softDeleteFields,
    softDelete,
    softDeleteMany,
    restore,
    findNotDeleted,
    findOneNotDeleted,
    findByIdNotDeleted,
    countNotDeleted,
    softDeletePlugin
};
