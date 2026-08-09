# Image fixtures

Image-upload browser scenarios require deterministic fixture files. The fixture
runner intentionally fails closed when a required fixture is absent. The
staging fixture set should include:

- portrait JPEGs with EXIF orientations 1–8;
- desktop JPEG and PNG screenshots;
- transparent PNG;
- small WebP;
- large JPEG;
- animated GIF (rejection and legacy-read coverage).

Fixtures must be synthetic or approved test data. Do not add production photos.
