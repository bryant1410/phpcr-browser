define([
    'angular'
], function(angular) {
    'use strict';

    var lastTree = null;

    function Tree(provider, $q, $rootScope, $state, $treeFactory, $graph, $progress) {
        this.provider = provider;
        this.$q = $q;
        this.$rootScope = $rootScope;
        this.$state = $state;
        this.$treeFactory = $treeFactory;
        this.$graph = $graph;
        this.$progress = $progress;

        this.deferred = $q.defer();
        this.$$init();
    }

    Tree.prototype.$$init = function() {
        this.tree = null;

        if (this.$state.params.path !== undefined) {
            var path = this.$state.params.path === null || this.$state.params.path.length === 0 ? '/' : this.$state.params.path;
            this.$$create({
                repository: this.$state.params.repository,
                workspace: this.$state.params.workspace,
                path: path
            });
        }

        this.$$listenStateChange();
    };

    Tree.prototype.$$decorate = function(tree) {
        var self = this;

        tree.registerListener(tree.HOOK_PRE_MOVE, function(next, treeDestination) {
            self.$progress.start();

            var destAbsPath = treeDestination.path().replace('/root', '') + '/' + this.name();
            self.$graph.find({
                repository: self.$state.params.repository,
                workspace: self.$state.params.workspace,
                path: this.path().replace('/root', '')
            }).then(function(node) {
                return node.moveTo(destAbsPath);
            }).then(function() {
                next();
            }, next)
            .finally(function() {
                self.$progress.done();
            })
        ;
        });

        tree.registerListener(tree.HOOK_PRE_REMOVE, function(next) {
            self.$progress.start();

            self.$graph.find({
                repository: self.$state.params.repository,
                workspace: self.$state.params.workspace,
                path: this.path().replace('/root', '')
            }).then(function(node) {
                return node.remove();
            }).then(function() {
                next();
            }, next)
            .finally(function() {
                self.$progress.done();
            })
        ;
        });

        tree.registerListener(tree.HOOK_PRE_APPEND, function(next, newNode) {
            var path = this.path().replace('/root', '');
            if (path === '') {
                path = '/';
            }

            self.$progress.start();

            self.$graph.find({
                repository: self.$state.params.repository,
                workspace: self.$state.params.workspace,
                path: path
            }).then(function(node) {
                return node.create(newNode.name());
            }).then(function() {
                next();
            }, next)
            .finally(function() {
                self.$progress.done();
            })
        ;
        });
        return tree;
    };

    Tree.prototype.$$create = function(findParams) {
        var self = this;

        this.$progress.start();

        this.$graph
            .find(findParams, { reducedTree: true })
            .then(function(node) {
                var root = node.reducedTree['/'];
                root.name = 'root';

                var tree = self.$treeFactory({
                    children: [root]
                });

                var current = tree.find('/root' + findParams.path);
                if (current) {
                    self.$treeFactory.activate(current);
                    do {
                        current.attr('collapsed', false);
                    } while (current = current.parent());
                } else {
                    var root = tree.find('/root');
                    root.attr('collapsed', false);
                    self.$treeFactory.activate(root);
                }

                self.tree = self.$$decorate(tree);
                return self.tree;
            })
            .then(
                self.deferred.notify,
                self.deferred.reject
            )
            .finally(this.$progress.done)
        ;
    };

    Tree.prototype.$$listenStateChange = function() {
        var self = this;
        this.$rootScope.$on('$stateChangeSuccess', function(evt, toState, toParams, fromState, fromParams) {
            if (toState.name === 'node' &&
                (fromParams.repository !== toParams.repository || fromParams.workspace !== toParams.workspace)
            ) {
                lastTree = null;
                var path = toParams.path === null || toParams.path.length === 0 ? '/' : toParams.path;
                self.$$create({
                    repository: toParams.repository,
                    workspace: toParams.workspace,
                    path: path
                });
            } else if (toState.name === 'node' && self.tree !== null) {
                var tree = self.tree.find('/root' + (toParams.path === '/' ? '' : toParams.path));

                if (!tree) {
                    return self.$$create({
                        repository: toParams.repository,
                        workspace: toParams.workspace,
                        path: (toParams.path === '/' ? '' : toParams.path)
                    });
                }

                self.$treeFactory.activate(tree);
            }
        });
    }

    Tree.$inject = ['provider', '$q', '$rootScope', '$state', '$treeFactory', '$graph', '$progress'];


    function TreeProvider() {}

    TreeProvider.prototype.$get = ['$injector', function($injector) {
        var promise = $injector
            .instantiate(Tree, {
                provider: this
            })
            .deferred
            .promise
        ;

        var listeners = [];

        promise.then(null, null, function(tree) {
            lastTree = tree;
            angular.forEach(listeners, function(listener) {
                listener(tree);
            });
        });

        promise.notified = function(listener) {
            if (lastTree) {
                listener(lastTree);
            }

            listeners.push(listener);

            return (function(listener) {
                return function() {
                    listeners.splice(listeners.indexOf(listener), 1);
                };
            }(listener));
        };

        return promise;
    }];

    TreeProvider.$inject = [];

    return TreeProvider;
});
