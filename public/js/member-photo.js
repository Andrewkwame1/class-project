(function () {
  function initPhotoUpload(container) {
    var input = container.querySelector('.member-photo-input');
    var preview = container.querySelector('.member-photo-preview');
    var placeholder = container.querySelector('.member-photo-placeholder');
    var actions = container.querySelector('.member-photo-actions');
    var removeBtn = container.querySelector('.member-photo-remove');
    var removeField = container.querySelector('input[name="removePhoto"]');
    var form = container.querySelector('form');

    if (!input || !preview) return;

    input.addEventListener('change', function () {
      var file = input.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        alert('Please choose an image file.');
        input.value = '';
        return;
      }

      var reader = new FileReader();
      reader.onload = function (e) {
        preview.src = e.target.result;
        preview.hidden = false;
        if (placeholder) placeholder.hidden = true;
        if (actions) actions.hidden = false;
        if (removeField) removeField.value = '0';
        
        var label = container.querySelector('.member-photo-label');
        if (label) label.classList.add('has-photo');
      };
      reader.readAsDataURL(file);
    });

    if (removeBtn) {
      removeBtn.addEventListener('click', function (e) {
        e.preventDefault();
        input.value = '';
        preview.hidden = true;
        preview.removeAttribute('src');
        if (placeholder) placeholder.hidden = false;
        if (removeField) removeField.value = '1';
        
        var label = container.querySelector('.member-photo-label');
        if (label) label.classList.remove('has-photo');

        if (form) {
          form.submit();
        } else if (actions) {
          actions.hidden = true;
        }
      });
    }
  }

  document.querySelectorAll('[data-photo-upload]').forEach(initPhotoUpload);
})();
