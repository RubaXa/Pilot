/**
 * @class ArtworkView
 * @extends DefaultView
 */
var ArtworkView = DefaultView.extend(/** @lends ArtworkView.prototype */{
	loadData: function (req) {
		return $.flickr('flickr.photos.getInfo', { photo_id: req.params.id }).then(function (res) {
			var dfd = $.Deferred(),
				photo = res.photo,
				srcTpl = '//farm{farm}.static.flickr.com/{server}/{id}_{secret}_b.jpg'
			;

			// Preload image
			$(new Image)
				.attr('src', srcTpl.replace(/\{(.*?)\}/g, function (_, key) {
					return photo[key];
				}))
				.one('load', function () {
					dfd.resolve({
						el: this,
						photo: photo
					});
				})
			;

			return dfd;
		});
	},

	onRoute: function (evt, req) {
		var data = this.getLoadedData(),
			owner = data.photo.owner
		;

		this.setBackUrl(req.referrer);
		this.setTitle(owner.realname || owner.username);
		this.setHtml(data.el);
	}
});
