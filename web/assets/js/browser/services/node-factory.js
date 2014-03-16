(function(angular, app) {
  'use strict';

  app.factory('mbNodeFactory', ['$q', 'mbApiFoundation', function($q, ApiFoundation) {
    var proxy = function(parent, children) {
      var result = [];
      angular.forEach(children, function(child) {
        result.push(new Node(child, parent._workspace, parent._finder));
      });
      return result;
    };

    var Node = function(node, workspace, finder) {
      this._restangular = node;
      this.__restangular = angular.copy(this._restangular); // To prevent reference interference
      this._finder = finder;
      this._children = [];
      this._workspace = workspace;
      this._childrenNotCached = false;
      if (this._restangular.hasChildren && this._restangular.children.length === 0) {
        this._childrenNotCached = true;
      } else {
        this._children = proxy(this, this._restangular.children);
      }
    };

    Node.prototype.getPath = function() {
      return this._restangular.path;
    };

    Node.prototype.getName = function() {
      return this._restangular.name;
    };

    Node.prototype.getWorkspace = function() {
      return this._workspace;
    };

    Node.prototype.getParent = function() {
      var components = this.getPath().split('/');
      components.pop();
      return this._finder('/' + this.getWorkspace().getRepository().getName() + '/' + this.getWorkspace().getName() + '/' + components.join('/'));
    };

    Node.prototype.getProperties = function() {
      return this._restangular.properties;
    };

    Node.prototype.setProperty = function(name, value, type) {
      var deferred = $q.defer(), self = this;
      if (this.getProperties()[name] === undefined) {
        deferred.reject('Unknown property');
      } else {
        type = (type !== undefined) ? type : self.getProperties()[name].type;
        try {
          value = (typeof(value) === 'object') ? JSON.stringify(value) : value;
        } catch (e) {}
        ApiFoundation.updateNodeProperty(
          self.getWorkspace().getRepository().getName(),
          self.getWorkspace().getName(),
          self.getPath(),
          name,
          value,
          type)
        .then(function(data) {
            try {
              self.getProperties()[name].value = JSON.parse(value);
            } catch (e) {
              self.getProperties()[name].value = value;
            }
            self.getProperties()[name].type = type;
            self.__restangular.properties[name].type = type;
            deferred.resolve(data);
          }, function(err) {
            self._restangular.properties[name] = angular.copy(self.__restangular.properties[name]);
            deferred.reject(err);
          });
      }

      return deferred.promise;
    };

    Node.prototype.deleteProperty = function(name) {
      var deferred = $q.defer(), self = this;

      ApiFoundation.deleteNodeProperty(
        this.getWorkspace().getRepository().getName(),
        this.getWorkspace().getName(),
        this.getPath(),
        name)
      .then(function(data) {
        delete self._restangular.properties[name];
        deferred.resolve(data);
      }, function(err) {
        deferred.reject(err);
      });
      return deferred.promise;
    };

    Node.prototype.createProperty = function(name, value, type) {
      var deferred = $q.defer(), self = this;
      ApiFoundation.createNodeProperty(
        this.getWorkspace().getRepository().getName(),
        this.getWorkspace().getName(),
        this.getPath(),
        name,
        value,
        type)
      .then(function(data) {
        self._restangular.properties[name] = { value: value, type: type };
        deferred.resolve(data);
      }, function(err) {
        deferred.reject(err);
      });
      return deferred.promise;
    };

    Node.prototype.getReducedTree = function() {
      return this._restangular.reducedTree;
    };

    Node.prototype.getChildren = function() {
      var deferred = $q.defer();
      var me = this._finder('/' + this.getWorkspace().getRepository().getName() + '/' + this.getWorkspace().getName() + this.getPath());
      this._restangular = me;
      deferred.resolve(proxy(this, this.restangular.children));
      return deferred.promise;
    };

    Node.prototype.getRawData = function() {
      return this._restangular;
    };

    Node.prototype.getSlug = function() {
      return this.getPath().split('/').join('_');
    };

    Node.prototype.delete = function() {
      return ApiFoundation.deleteNode(this.getWorkspace().getRepository().getName(), this.getWorkspace().getName(), this.getPath());
    };

    Node.prototype.move = function(path) {
      return ApiFoundation.moveNode(this.getWorkspace().getRepository().getName(), this.getWorkspace().getName(), this.getPath(), path + '/' + this.getName());
    };

    Node.prototype.hasChildren = function() {
      return this._restangular.hasChildren;
    };

    return {
      build: function(node, workspace, finder) {
        return new Node(node, workspace, finder);
      },
      accept: function(data) {
        return data.name !== undefined && data.path !== undefined;
      }
    };
  }]);
})(angular, angular.module('browserApp'));